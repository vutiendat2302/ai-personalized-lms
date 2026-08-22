package com.ailms.event;

import com.ailms.client.AiServiceClient;
import com.ailms.entity.ClassResourceEntity;
import com.ailms.entity.enums.RagProcessingStatusEnum;
import com.ailms.repository.ClassResourceRepository;
import com.ailms.request.ai.AiIngestRequest;
import com.ailms.response.ai.AiIngestResponse;
import com.ailms.service.IFileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Đồng bộ ClassResource sang RAG bất đồng bộ và lưu trạng thái xử lý để UI theo dõi. */
@Component
@RequiredArgsConstructor
@Slf4j
public class ClassResourceKnowledgeSyncListener {
    private static final String SOURCE_PREFIX = "class-resource-";

    private final ClassResourceRepository resourceRepository;
    private final IFileStorageService fileStorageService;
    private final AiServiceClient aiServiceClient;

    /** Xử lý ingestion sau commit để lỗi AI không rollback nghiệp vụ tạo tài liệu lớp. */
    @Async("aiIngestionTaskExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onResourceChanged(ClassResourceKnowledgeChangedEvent event) {
        if (event.deleted()) {
            deleteSource(event.resourceId());
            return;
        }
        resourceRepository.findById(event.resourceId()).ifPresent(this::ingestSafely);
    }

    /** Ingest một resource và cập nhật READY/FAILED mà không log nội dung tài liệu. */
    private void ingestSafely(ClassResourceEntity resource) {
        resource.setRagStatus(RagProcessingStatusEnum.PROCESSING);
        resource.setRagError(null);
        resourceRepository.save(resource);
        try {
            AiIngestResponse response = aiServiceClient.ingest(toRequest(resource));
            resource.setRagStatus(RagProcessingStatusEnum.READY);
            resource.setRagChunksCount(response.getChunksCount() == null ? 0 : response.getChunksCount());
            resource.setRagError(null);
        } catch (RuntimeException exception) {
            resource.setRagStatus(RagProcessingStatusEnum.FAILED);
            resource.setRagChunksCount(0);
            resource.setRagError("Không thể xử lý tài liệu cho AI. Hãy thử đồng bộ lại.");
            log.warn("Không thể ingest ClassResource {} sang RAG: {}", resource.getId(), exception.getMessage());
        }
        resourceRepository.save(resource);
    }

    /** Xóa source vector khi tài liệu lớp đã bị xóa khỏi database. */
    private void deleteSource(Long resourceId) {
        try {
            aiServiceClient.deleteSource(SOURCE_PREFIX + resourceId);
        } catch (RuntimeException exception) {
            log.warn("Không thể xóa vector ClassResource {}: {}", resourceId, exception.getMessage());
        }
    }

    /** Đọc object MinIO và dựng payload có metadata class/course để filter RAG. */
    private AiIngestRequest toRequest(ClassResourceEntity resource) {
        String sourceType = sourceType(resource);
        try (InputStream input = fileStorageService.download(resource.getFileKey())) {
            byte[] bytes = input.readAllBytes();
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("resourceId", String.valueOf(resource.getId()));
            metadata.put("classId", String.valueOf(resource.getClassEntity().getId()));
            metadata.put("visibility", "CLASS");
            metadata.put("title", resource.getTitle());
            metadata.put("fileName", resource.getFileName());
            if (resource.getClassEntity().getCourseEntity() != null) {
                metadata.put("courseId", String.valueOf(resource.getClassEntity().getCourseEntity().getId()));
            }
            AiIngestRequest.AiIngestRequestBuilder builder = AiIngestRequest.builder()
                    .sourceId(SOURCE_PREFIX + resource.getId())
                    .sourceType(sourceType)
                    .mimeType(resource.getFileType())
                    .module("TRAINING")
                    .domain("class_resource")
                    .courseId(resource.getClassEntity().getCourseEntity() == null ? null
                            : String.valueOf(resource.getClassEntity().getCourseEntity().getId()))
                    .allowedRoles(List.of("ROLE_STUDENT", "ROLE_TEACHER", "ROLE_TA", "ROLE_ADMIN"))
                    .metadata(metadata);
            if ("text".equals(sourceType)) {
                builder.content(new String(bytes, StandardCharsets.UTF_8));
            } else {
                builder.fileBase64(Base64.getEncoder().encodeToString(bytes));
            }
            return builder.build();
        } catch (Exception exception) {
            throw new IllegalStateException("Không thể đọc ClassResource từ MinIO", exception);
        }
    }

    /** Ánh xạ MIME hoặc phần mở rộng sang extractor AI Service hiện có. */
    private String sourceType(ClassResourceEntity resource) {
        String mime = resource.getFileType() == null ? "" : resource.getFileType().toLowerCase(Locale.ROOT);
        String name = resource.getFileName() == null ? "" : resource.getFileName().toLowerCase(Locale.ROOT);
        if (mime.contains("pdf") || name.endsWith(".pdf")) return "pdf";
        if (mime.contains("wordprocessingml") || name.endsWith(".docx")) return "docx";
        if (mime.startsWith("image/") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image";
        if (mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) return "text";
        throw new IllegalArgumentException("Tài liệu lớp chỉ hỗ trợ PDF, DOCX, TXT, Markdown, PNG hoặc JPEG cho RAG");
    }
}
