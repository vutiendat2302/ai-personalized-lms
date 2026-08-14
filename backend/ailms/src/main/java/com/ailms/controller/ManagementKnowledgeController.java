package com.ailms.controller;

import com.ailms.response.ApiResponse;
import com.ailms.response.ai.AiKnowledgeSyncResponse;
import com.ailms.service.imp.ManagementKnowledgeSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** API Admin quản lý việc nạp tri thức an toàn sang RAG. */
@RestController
@RequestMapping("${api.prefix}/ai/knowledge")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ManagementKnowledgeController {

    private final ManagementKnowledgeSyncService managementKnowledgeSyncService;

    /** Đồng bộ template hợp đồng ACTIVE để RAG trả lời điều khoản chung cho Admin và HR. */
    @PostMapping("/contract-templates/sync")
    public ResponseEntity<ApiResponse<AiKnowledgeSyncResponse>> syncContractTemplates() {
        int sourcesSynced = managementKnowledgeSyncService.syncActiveContractTemplates();
        return ResponseEntity.ok(ApiResponse.of("Đồng bộ tri thức mẫu hợp đồng thành công",
                AiKnowledgeSyncResponse.builder()
                        .knowledgeType("contract_template")
                        .sourcesSynced(sourcesSynced)
                        .build()));
    }
}
