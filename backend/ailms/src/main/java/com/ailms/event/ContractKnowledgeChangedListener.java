package com.ailms.event;

import com.ailms.client.AiServiceClient;
import com.ailms.entity.EmployeeContractEntity;
import com.ailms.repository.EmployeeContractRepository;
import com.ailms.request.ai.AiIngestRequest;
import com.ailms.service.imp.MinioFileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.io.InputStream;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/** Chủ động đồng bộ dữ liệu hợp đồng đã commit sang AI Service. */
@Component
@RequiredArgsConstructor
@Slf4j
public class ContractKnowledgeChangedListener {

    private final EmployeeContractRepository contractRepository;
    private final AiServiceClient aiServiceClient;
    private final MinioFileStorageService fileStorageService;

    /** Upsert hoặc xóa nguồn RAG sau khi transaction MySQL commit thành công. */
    @Async("aiIngestionTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void handle(ContractKnowledgeChangedEvent event) {
        String sourceId = String.valueOf(event.contractId());
        try {
            if (event.operation() == ContractKnowledgeChangedEvent.Operation.DELETE) {
                aiServiceClient.deleteSource(sourceId);
                return;
            }
            EmployeeContractEntity contract = contractRepository.findById(event.contractId())
                    .orElse(null);
            if (contract == null) {
                aiServiceClient.deleteSource(sourceId);
                return;
            }
            aiServiceClient.ingest(toIngestRequest(contract));
        } catch (Exception exception) {
            log.error("Không thể đồng bộ RAG cho hợp đồng {}", event.contractId(), exception);
        }
    }

    /** Chuyển hợp đồng thành PDF/DOCX hoặc text fallback có phân quyền bắt buộc. */
    private AiIngestRequest toIngestRequest(EmployeeContractEntity contract) {
        var employee = contract.getEmployee();
        String content = "ID hợp đồng: %s\nMã nhân viên: %s\nTên nhân viên: %s\n"
                + "Loại hợp đồng: %s\nNgày bắt đầu: %s\nNgày kết thúc: %s\n"
                + "Lương cơ bản: %s\nHình thức lương: %s\nTrạng thái: %s\nTrạng thái ký: %s"
                .formatted(
                        contract.getId(),
                        employee.getEmployeeCode(),
                        employee.getUserEntity().getFullName(),
                        contract.getContractTypeEnum(),
                        contract.getStartDate(),
                        contract.getEndDate(),
                        contract.getBaseSalary(),
                        contract.getSalaryTypeEnum(),
                        contract.getStatus(),
                        contract.getSigningStatus());
        AiIngestRequest.AiIngestRequestBuilder builder = AiIngestRequest.builder()
                .sourceId(String.valueOf(contract.getId()))
                .module("HR")
                .domain("hr_contract")
                .allowedRoles(List.of("ROLE_ADMIN", "ROLE_HR"))
                .metadata(Map.of(
                        "entityType", "EmployeeContract",
                        "entityId", String.valueOf(contract.getId()),
                        "title", "Hợp đồng " + contract.getId()));
        String fileKey = contract.getFileKey();
        if (fileKey != null && (fileKey.toLowerCase().endsWith(".pdf")
                || fileKey.toLowerCase().endsWith(".docx"))) {
            boolean pdf = fileKey.toLowerCase().endsWith(".pdf");
            try (InputStream input = fileStorageService.download(fileKey)) {
                return builder
                        .sourceType(pdf ? "pdf" : "docx")
                        .fileBase64(Base64.getEncoder().encodeToString(input.readAllBytes()))
                        .mimeType(pdf
                                ? "application/pdf"
                                : "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                        .build();
            } catch (Exception exception) {
                log.warn("Không đọc được file {}, dùng dữ liệu hợp đồng dạng text", fileKey);
            }
        }
        return builder.sourceType("text").content(content).build();
    }
}
