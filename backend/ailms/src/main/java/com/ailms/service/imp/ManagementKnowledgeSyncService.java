package com.ailms.service.imp;

import com.ailms.client.AiServiceClient;
import com.ailms.entity.ContractTemplateEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.repository.ContractTemplateRepository;
import com.ailms.request.ai.AiIngestRequest;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/** Đồng bộ tri thức HR dùng chung, không có dữ liệu hợp đồng cá nhân, sang RAG. */
@Service
@RequiredArgsConstructor
public class ManagementKnowledgeSyncService {

    private final ContractTemplateRepository contractTemplateRepository;
    private final AiServiceClient aiServiceClient;

    /** Ingest tất cả template hợp đồng ACTIVE để Admin/HR hỏi điều khoản và quy trình chung. */
    @Transactional(readOnly = true)
    public int syncActiveContractTemplates() {
        List<ContractTemplateEntity> templates = contractTemplateRepository.findAll();
        templates.stream()
                .filter(template -> template.getStatus() == BaseStatusEnum.ACTIVE)
                .forEach(template -> aiServiceClient.ingest(toIngestRequest(template)));
        templates.stream()
                .filter(template -> template.getStatus() != BaseStatusEnum.ACTIVE)
                .forEach(template -> aiServiceClient.deleteSource(sourceId(template)));
        return (int) templates.stream()
                .filter(template -> template.getStatus() == BaseStatusEnum.ACTIVE)
                .count();
    }

    /** Chuyển HTML template thành text tri thức, không chèn dữ liệu nhân viên hoặc hợp đồng cụ thể. */
    private AiIngestRequest toIngestRequest(ContractTemplateEntity template) {
        String content = Jsoup.parse(template.getTemplateContent()).text();
        return AiIngestRequest.builder()
                .sourceId(sourceId(template))
                .sourceType("text")
                .content("Tên mẫu: " + template.getName() + "\nLoại hợp đồng: "
                        + template.getContractTypeEnum() + "\nPhiên bản: " + template.getVersion()
                        + "\n\n" + content)
                .module("HR")
                .domain("hr_template")
                .allowedRoles(List.of("ROLE_ADMIN", "ROLE_HR"))
                .metadata(Map.of(
                        "knowledgeType", "contract_template",
                        "templateId", String.valueOf(template.getId()),
                        "title", template.getName(),
                        "version", template.getVersion()))
                .build();
    }

    /** Tạo source ID ổn định để ingest lại thay thế vector cũ của cùng một template. */
    private String sourceId(ContractTemplateEntity template) {
        return "contract-template-" + template.getId();
    }
}
