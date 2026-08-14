package com.ailms.event;

import com.ailms.client.AiServiceClient;
import com.ailms.entity.EmployeeContractEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.UserEntity;
import com.ailms.repository.EmployeeContractRepository;
import com.ailms.request.ai.AiIngestRequest;
import com.ailms.service.imp.MinioFileStorageService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.ByteArrayInputStream;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

/** Kiểm tra đồng bộ chủ động hợp đồng sang RAG theo Snowflake ID. */
class ContractKnowledgeChangedListenerTest {

    /** UPSERT phải dùng contract ID làm sourceId và khóa quyền Admin/HR. */
    @Test
    void upsertUsesContractSnowflakeId() {
        EmployeeContractRepository repository = mock(EmployeeContractRepository.class);
        AiServiceClient client = mock(AiServiceClient.class);
        ContractKnowledgeChangedListener listener =
                new ContractKnowledgeChangedListener(
                        repository, client, mock(MinioFileStorageService.class));
        UserEntity user = UserEntity.builder().fullName("Nguyễn Văn A").build();
        EmployeeEntity employee = EmployeeEntity.builder()
                .employeeCode("NV001")
                .userEntity(user)
                .build();
        EmployeeContractEntity contract = EmployeeContractEntity.builder()
                .id(345050865599516672L)
                .employee(employee)
                .build();
        when(repository.findById(contract.getId())).thenReturn(Optional.of(contract));

        listener.handle(new ContractKnowledgeChangedEvent(
                contract.getId(), ContractKnowledgeChangedEvent.Operation.UPSERT));

        ArgumentCaptor<AiIngestRequest> captor = ArgumentCaptor.forClass(AiIngestRequest.class);
        verify(client).ingest(captor.capture());
        assertEquals("345050865599516672", captor.getValue().getSourceId());
        assertEquals("hr_contract", captor.getValue().getDomain());
        assertEquals(2, captor.getValue().getAllowedRoles().size());
    }

    /** DELETE phải xóa đúng sourceId mà không đọc lại entity đã mất. */
    @Test
    void deleteRemovesContractSource() {
        EmployeeContractRepository repository = mock(EmployeeContractRepository.class);
        AiServiceClient client = mock(AiServiceClient.class);
        ContractKnowledgeChangedListener listener =
                new ContractKnowledgeChangedListener(
                        repository, client, mock(MinioFileStorageService.class));

        listener.handle(new ContractKnowledgeChangedEvent(
                345050865599516672L, ContractKnowledgeChangedEvent.Operation.DELETE));

        verify(client).deleteSource("345050865599516672");
        verifyNoInteractions(repository);
    }

    /** Hợp đồng có PDF phải gửi file base64 để AI Service extract hoặc OCR. */
    @Test
    void upsertReadsPdfFromMinio() {
        EmployeeContractRepository repository = mock(EmployeeContractRepository.class);
        AiServiceClient client = mock(AiServiceClient.class);
        MinioFileStorageService storage = mock(MinioFileStorageService.class);
        ContractKnowledgeChangedListener listener =
                new ContractKnowledgeChangedListener(repository, client, storage);
        UserEntity user = UserEntity.builder().fullName("Nguyễn Văn A").build();
        EmployeeEntity employee = EmployeeEntity.builder()
                .employeeCode("NV001")
                .userEntity(user)
                .build();
        EmployeeContractEntity contract = EmployeeContractEntity.builder()
                .id(345050865599516672L)
                .employee(employee)
                .fileKey("contracts/contract.pdf")
                .build();
        when(repository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(storage.download(contract.getFileKey()))
                .thenReturn(new ByteArrayInputStream("pdf-bytes".getBytes()));

        listener.handle(new ContractKnowledgeChangedEvent(
                contract.getId(), ContractKnowledgeChangedEvent.Operation.UPSERT));

        ArgumentCaptor<AiIngestRequest> captor = ArgumentCaptor.forClass(AiIngestRequest.class);
        verify(client).ingest(captor.capture());
        assertEquals("pdf", captor.getValue().getSourceType());
        assertEquals("cGRmLWJ5dGVz", captor.getValue().getFileBase64());
    }
}
