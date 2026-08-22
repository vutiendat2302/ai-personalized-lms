package com.ailms.event;

import com.ailms.client.AiServiceClient;
import com.ailms.entity.FileMetadataEntity;
import com.ailms.entity.LessonResourceEntity;
import com.ailms.repository.LessonResourceRepository;
import com.ailms.request.ai.AiIngestRequest;
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

/** Đồng bộ lesson resource vào cùng kho RAG để Chat LESSON_ONLY truy xuất theo lessonId. */
@Component
@RequiredArgsConstructor
@Slf4j
public class LessonResourceKnowledgeSyncListener {
    private static final String SOURCE_PREFIX = "lesson-resource-";

    private final LessonResourceRepository resourceRepository;
    private final IFileStorageService fileStorageService;
    private final AiServiceClient aiServiceClient;

    /** Ingest bất đồng bộ sau commit hoặc xóa source khi lesson resource bị xóa. */
    @Async("aiIngestionTaskExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onResourceChanged(LessonResourceKnowledgeChangedEvent event) {
        if (event.deleted()) {
            deleteSource(event.resourceId());
            return;
        }
        resourceRepository.findById(event.resourceId()).ifPresent(this::ingestSafely);
    }

    /** Ingest nguồn được hỗ trợ và cô lập lỗi để thao tác lesson không bị ảnh hưởng. */
    private void ingestSafely(LessonResourceEntity resource) {
        try {
            aiServiceClient.ingest(toRequest(resource));
        } catch (RuntimeException exception) {
            log.warn("Không thể ingest LessonResource {} sang RAG: {}", resource.getId(), exception.getMessage());
        }
    }

    /** Xóa vector của lesson resource đã bị xóa. */
    private void deleteSource(Long resourceId) {
        try {
            aiServiceClient.deleteSource(SOURCE_PREFIX + resourceId);
        } catch (RuntimeException exception) {
            log.warn("Không thể xóa vector LessonResource {}: {}", resourceId, exception.getMessage());
        }
    }

    /** Dựng payload có course/section/lesson metadata để scoped retrieval. */
    private AiIngestRequest toRequest(LessonResourceEntity resource) {
        FileMetadataEntity file = resource.getFileMetadata();
        if (file == null) throw new IllegalArgumentException("LessonResource chưa có file metadata");
        String sourceType = sourceType(file);
        try (InputStream input = fileStorageService.download(file.getFileKey())) {
            byte[] bytes = input.readAllBytes();
            var lesson = resource.getLessonEntity();
            var section = lesson.getCourseSectionEntity();
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("resourceId", String.valueOf(resource.getId()));
            metadata.put("lessonId", String.valueOf(lesson.getId()));
            metadata.put("sectionId", String.valueOf(section.getId()));
            metadata.put("courseId", String.valueOf(section.getCourseEntity().getId()));
            metadata.put("visibility", "COURSE");
            metadata.put("title", resource.getName());
            metadata.put("fileName", file.getOriginalName());
            AiIngestRequest.AiIngestRequestBuilder builder = AiIngestRequest.builder()
                    .sourceId(SOURCE_PREFIX + resource.getId()).sourceType(sourceType)
                    .mimeType(file.getContentType()).module("TRAINING").domain("lesson_resource")
                    .courseId(String.valueOf(section.getCourseEntity().getId()))
                    .sectionId(String.valueOf(section.getId()))
                    .lessonId(String.valueOf(lesson.getId()))
                    .allowedRoles(List.of("ROLE_STUDENT", "ROLE_TEACHER", "ROLE_TA", "ROLE_ADMIN"))
                    .metadata(metadata);
            if ("text".equals(sourceType)) builder.content(new String(bytes, StandardCharsets.UTF_8));
            else builder.fileBase64(Base64.getEncoder().encodeToString(bytes));
            return builder.build();
        } catch (Exception exception) {
            throw new IllegalStateException("Không thể đọc LessonResource từ MinIO", exception);
        }
    }

    /** Ánh xạ MIME/file name sang extractor RAG được hỗ trợ. */
    private String sourceType(FileMetadataEntity file) {
        String mime = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String name = file.getOriginalName() == null ? "" : file.getOriginalName().toLowerCase(Locale.ROOT);
        if (mime.contains("pdf") || name.endsWith(".pdf")) return "pdf";
        if (mime.contains("wordprocessingml") || name.endsWith(".docx")) return "docx";
        if (mime.startsWith("image/") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image";
        if (mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) return "text";
        throw new IllegalArgumentException("LessonResource không hỗ trợ embedding định dạng này");
    }
}
