package com.ailms.event;

import com.ailms.client.AiServiceClient;
import com.ailms.entity.FileMetadataEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.FileUsageTypeEnum;
import com.ailms.repository.FileMetadataRepository;
import com.ailms.request.ai.AiIngestRequest;
import com.ailms.service.IFileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/** Đồng bộ policy hiện hành từ MinIO sang RAG và loại vector phiên bản cũ. */
@Component
@RequiredArgsConstructor
@Slf4j
public class PolicyKnowledgeSyncListener {
    private final FileMetadataRepository fileMetadataRepository;
    private final IFileStorageService fileStorageService;
    private final AiServiceClient aiServiceClient;

    /** Backfill policy đã tồn tại khi Backend khởi động. */
    @EventListener(ApplicationReadyEvent.class)
    public void syncExistingPolicy() {
        currentPolicy().ifPresent(this::syncSafely);
    }

    /** Đồng bộ policy mới sau khi transaction metadata đã commit. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPolicyChanged(PolicyFileChangedEvent event) {
        fileMetadataRepository.findById(event.fileId()).filter(this::isActivePolicy).ifPresent(this::syncSafely);
    }

    /** Đồng bộ có cô lập lỗi để upload policy không bị rollback vì AI Service. */
    private void syncSafely(FileMetadataEntity policy) {
        try {
            removeOldPolicyVectors(policy.getId());
            aiServiceClient.ingest(toIngestRequest(policy));
        } catch (RuntimeException exception) {
            log.warn("Không thể đồng bộ policy {} sang RAG: {}", policy.getId(), exception.getMessage());
        }
    }

    /** Dựng payload ingest từ object MinIO theo định dạng extractor hỗ trợ. */
    private AiIngestRequest toIngestRequest(FileMetadataEntity policy) {
        String sourceType = sourceType(policy);
        try (InputStream input = fileStorageService.download(policy.getFileKey())) {
            byte[] bytes = input.readAllBytes();
            AiIngestRequest.AiIngestRequestBuilder builder = AiIngestRequest.builder()
                    .sourceId("policy-" + policy.getId()).sourceType(sourceType)
                    .mimeType(policy.getContentType()).module("SUPPORT").domain("support_policy")
                    .allowedRoles(List.of("ALL"))
                    .metadata(Map.of("fileId", String.valueOf(policy.getId()), "fileName", policy.getOriginalName()));
            if ("text".equals(sourceType)) builder.content(new String(bytes, StandardCharsets.UTF_8));
            else builder.fileBase64(Base64.getEncoder().encodeToString(bytes));
            return builder.build();
        } catch (Exception exception) {
            throw new IllegalStateException("Không thể đọc policy từ MinIO", exception);
        }
    }

    /** Ánh xạ MIME policy sang extractor hiện có của AI Service. */
    private String sourceType(FileMetadataEntity policy) {
        String contentType = policy.getContentType() == null ? "" : policy.getContentType().toLowerCase();
        String name = policy.getOriginalName().toLowerCase();
        if (contentType.contains("pdf") || name.endsWith(".pdf")) return "pdf";
        if (contentType.contains("wordprocessingml") || name.endsWith(".docx")) return "docx";
        if (contentType.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) return "text";
        throw new IllegalArgumentException("Policy chỉ hỗ trợ PDF, DOCX, TXT hoặc Markdown để embedding");
    }

    /** Xóa source policy cũ để AI không trộn nhiều phiên bản chính sách. */
    private void removeOldPolicyVectors(Long currentId) {
        fileMetadataRepository.findByUsageTypeAndStatus(FileUsageTypeEnum.POLICY, BaseStatusEnum.ACTIVE).stream()
                .map(FileMetadataEntity::getId).filter(id -> !id.equals(currentId))
                .forEach(id -> aiServiceClient.deleteSource("policy-" + id));
    }

    /** Lấy đúng policy active mới nhất. */
    private java.util.Optional<FileMetadataEntity> currentPolicy() {
        return fileMetadataRepository.findFirstByUsageTypeAndStatusOrderByCreatedAtDesc(
                FileUsageTypeEnum.POLICY, BaseStatusEnum.ACTIVE);
    }

    /** Kiểm tra event chỉ xử lý policy đang active. */
    private boolean isActivePolicy(FileMetadataEntity file) {
        return file.getUsageType() == FileUsageTypeEnum.POLICY && file.getStatus() == BaseStatusEnum.ACTIVE;
    }
}
