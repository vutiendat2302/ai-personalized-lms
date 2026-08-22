package com.ailms.service.imp;

import com.ailms.client.AiServiceClient;
import com.ailms.entity.ContractTemplateEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.repository.ContractTemplateRepository;
import com.ailms.request.ai.AiIngestRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Kiểm tra RAG chỉ nhận template dùng chung, đã loại HTML và không có hợp đồng cá nhân. */
class ManagementKnowledgeSyncServiceTest {

    /** Đồng bộ template ACTIVE phải tạo một nguồn RAG có domain an toàn và role cụ thể. */
    @Test
    void syncActiveContractTemplatesIngestsSanitizedKnowledge() {
        ContractTemplateRepository repository = mock(ContractTemplateRepository.class);
        AiServiceClient client = mock(AiServiceClient.class);
        ManagementKnowledgeSyncService service = new ManagementKnowledgeSyncService(repository, client);
        ContractTemplateEntity template = ContractTemplateEntity.builder()
                .id(123L)
                .name("Mẫu thử việc")
                .contractTypeEnum(ContractTypeEnum.PROBATION)
                .templateContent("<h1>Mẫu thử việc</h1><p>Thời hạn {{probationPeriod}}</p>")
                .version(1)
                .status(BaseStatusEnum.ACTIVE)
                .build();
        when(repository.findAll()).thenReturn(List.of(template));

        int synced = service.syncActiveContractTemplates();

        ArgumentCaptor<AiIngestRequest> captor = ArgumentCaptor.forClass(AiIngestRequest.class);
        verify(client).ingest(captor.capture());
        assertEquals(1, synced);
        assertEquals("contract-template-123", captor.getValue().getSourceId());
        assertEquals("hr_template", captor.getValue().getDomain());
        assertFalse(captor.getValue().getContent().contains("<h1>"));
        assertEquals(List.of("ROLE_ADMIN", "ROLE_HR"), captor.getValue().getAllowedRoles());
    }
}
