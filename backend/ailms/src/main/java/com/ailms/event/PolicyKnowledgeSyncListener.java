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

/** Đồng bộ toàn bộ policy đang ACTIVE từ MinIO sang RAG. */
@Component
@RequiredArgsConstructor
@Slf4j
public class PolicyKnowledgeSyncListener {
    private final FileMetadataRepository fileMetadataRepository;
    private final IFileStorageService fileStorageService;
    private final AiServiceClient aiServiceClient;

    /** Backfill toàn bộ policy đang ACTIVE khi Backend khởi động. */
    @EventListener(ApplicationReadyEvent.class)
    public void syncExistingPolicy() {
        syncAllActivePolicies();
    }

    /** Đồng bộ lại toàn bộ policy sau khi metadata mới commit để không bỏ sót tài liệu cũ. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPolicyChanged(PolicyFileChangedEvent event) {
        syncAllActivePolicies();
    }

    /** Ingest toàn bộ policy ACTIVE, giữ lại vector của các tài liệu còn hiệu lực. */
    private void syncAllActivePolicies() {
        fileMetadataRepository.findByUsageTypeAndStatus(FileUsageTypeEnum.POLICY, BaseStatusEnum.ACTIVE)
                .forEach(this::syncSafely);
    }

    /** Đồng bộ có cô lập lỗi để upload policy không bị rollback vì AI Service. */
    private void syncSafely(FileMetadataEntity policy) {
        try {
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

}
