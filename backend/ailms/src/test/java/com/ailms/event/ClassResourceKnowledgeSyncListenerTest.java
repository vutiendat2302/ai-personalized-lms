package com.ailms.event;

import com.ailms.client.AiServiceClient;
import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassResourceEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.enums.RagProcessingStatusEnum;
import com.ailms.repository.ClassResourceRepository;
import com.ailms.request.ai.AiIngestRequest;
import com.ailms.response.ai.AiIngestResponse;
import com.ailms.service.IFileStorageService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.ByteArrayInputStream;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Kiểm tra ClassResource được ingest với scope lớp và cập nhật trạng thái an toàn. */
class ClassResourceKnowledgeSyncListenerTest {

    /** Ingest thành công phải gửi class/course metadata và lưu số chunk READY. */
    @Test
    void ingestClassResourceWithTrustedScope() {
        ClassResourceRepository repository = mock(ClassResourceRepository.class);
        IFileStorageService storage = mock(IFileStorageService.class);
        AiServiceClient client = mock(AiServiceClient.class);
        ClassResourceEntity resource = resource();
        when(repository.findById(30L)).thenReturn(Optional.of(resource));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(storage.download("classes/file.pdf"))
                .thenReturn(new ByteArrayInputStream("pdf".getBytes()));
        AiIngestResponse response = new AiIngestResponse();
        response.setChunksCount(7);
        when(client.ingest(any())).thenReturn(response);
        ClassResourceKnowledgeSyncListener listener =
                new ClassResourceKnowledgeSyncListener(repository, storage, client);

        listener.onResourceChanged(new ClassResourceKnowledgeChangedEvent(30L, false));

        ArgumentCaptor<AiIngestRequest> captor = ArgumentCaptor.forClass(AiIngestRequest.class);
        verify(client).ingest(captor.capture());
        assertEquals("class-resource-30", captor.getValue().getSourceId());
        assertEquals("10", captor.getValue().getCourseId());
        assertEquals("20", captor.getValue().getMetadata().get("classId"));
        assertEquals(RagProcessingStatusEnum.READY, resource.getRagStatus());
        assertEquals(7, resource.getRagChunksCount());
    }

    /** Lỗi AI phải giữ resource và đánh dấu FAILED để người dùng retry. */
    @Test
    void ingestionFailureMarksResourceFailed() {
        ClassResourceRepository repository = mock(ClassResourceRepository.class);
        IFileStorageService storage = mock(IFileStorageService.class);
        AiServiceClient client = mock(AiServiceClient.class);
        ClassResourceEntity resource = resource();
        when(repository.findById(30L)).thenReturn(Optional.of(resource));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(storage.download("classes/file.pdf"))
                .thenReturn(new ByteArrayInputStream("pdf".getBytes()));
        when(client.ingest(any())).thenThrow(new IllegalStateException("AI unavailable"));
        ClassResourceKnowledgeSyncListener listener =
                new ClassResourceKnowledgeSyncListener(repository, storage, client);

        listener.onResourceChanged(new ClassResourceKnowledgeChangedEvent(30L, false));

        assertEquals(RagProcessingStatusEnum.FAILED, resource.getRagStatus());
        assertEquals(0, resource.getRagChunksCount());
    }

    /** Sự kiện delete chỉ xóa source vector và không đọc MinIO. */
    @Test
    void deleteRemovesVectorSource() {
        ClassResourceRepository repository = mock(ClassResourceRepository.class);
        IFileStorageService storage = mock(IFileStorageService.class);
        AiServiceClient client = mock(AiServiceClient.class);
        ClassResourceKnowledgeSyncListener listener =
                new ClassResourceKnowledgeSyncListener(repository, storage, client);

        listener.onResourceChanged(new ClassResourceKnowledgeChangedEvent(30L, true));

        verify(client).deleteSource("class-resource-30");
    }

    /** Tạo resource PDF có quan hệ course/class tối thiểu cho test. */
    private ClassResourceEntity resource() {
        CourseEntity course = CourseEntity.builder().id(10L).build();
        ClassEntity clazz = ClassEntity.builder().id(20L).courseEntity(course).build();
        return ClassResourceEntity.builder().id(30L).classEntity(clazz).title("Giáo trình")
                .fileKey("classes/file.pdf").fileName("file.pdf").fileType("application/pdf")
                .uploadedByUserId(1L).ragStatus(RagProcessingStatusEnum.PENDING).ragChunksCount(0).build();
    }
}
