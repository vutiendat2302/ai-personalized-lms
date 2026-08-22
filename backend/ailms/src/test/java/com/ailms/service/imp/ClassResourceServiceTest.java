package com.ailms.service.imp;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassResourceEntity;
import com.ailms.entity.enums.RagProcessingStatusEnum;
import com.ailms.event.ClassResourceKnowledgeChangedEvent;
import com.ailms.exception.BadRequestException;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.ClassResourceRepository;
import com.ailms.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Kiểm tra retry RAG chỉ tạo một vòng ingestion hợp lệ từ trạng thái FAILED. */
class ClassResourceServiceTest {
    private ClassResourceRepository resourceRepository;
    private ApplicationEventPublisher eventPublisher;
    private ClassResourceService service;

    /** Khởi tạo service với repository và event publisher độc lập cho từng case. */
    @BeforeEach
    void setUp() {
        resourceRepository = mock(ClassResourceRepository.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        service = new ClassResourceService(
                resourceRepository,
                mock(ClassRepository.class),
                mock(UserRepository.class),
                eventPublisher);
    }

    /** Resource FAILED được reset PENDING và phát đúng một event sau khi lưu. */
    @Test
    void retryFailedResource() {
        ClassResourceEntity resource = resource(RagProcessingStatusEnum.FAILED);
        when(resourceRepository.findById(20L)).thenReturn(Optional.of(resource));
        when(resourceRepository.save(resource)).thenReturn(resource);

        var response = service.retryRag(20L);

        assertEquals("PENDING", response.getRagStatus());
        assertEquals(0, response.getRagChunksCount());
        verify(eventPublisher).publishEvent(any(ClassResourceKnowledgeChangedEvent.class));
    }

    /** Resource READY/PROCESSING không được enqueue lại để tránh job trùng. */
    @Test
    void rejectRetryWhenResourceIsNotFailed() {
        when(resourceRepository.findById(20L))
                .thenReturn(Optional.of(resource(RagProcessingStatusEnum.READY)));

        assertThrows(BadRequestException.class, () -> service.retryRag(20L));

        verify(resourceRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    /** Dựng resource lớp tối thiểu cho các case retry. */
    private ClassResourceEntity resource(RagProcessingStatusEnum status) {
        return ClassResourceEntity.builder()
                .id(20L)
                .classEntity(ClassEntity.builder().id(10L).build())
                .title("Giáo trình")
                .fileKey("classes/10/document.pdf")
                .ragStatus(status)
                .ragChunksCount(4)
                .ragError("old error")
                .build();
    }
}
