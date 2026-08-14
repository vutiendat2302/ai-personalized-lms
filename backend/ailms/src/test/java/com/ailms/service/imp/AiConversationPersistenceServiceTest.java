package com.ailms.service.imp;

import com.ailms.entity.AiConversationEntity;
import com.ailms.entity.AiMessageEntity;
import com.ailms.entity.enums.AiConversationScope;
import com.ailms.repository.AiConversationRepository;
import com.ailms.repository.AiMessageRepository;
import com.ailms.request.ai.AiChatRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Kiểm tra persistence hội thoại mà không cần kết nối MySQL thật. */
@ExtendWith(MockitoExtension.class)
class AiConversationPersistenceServiceTest {

    @Mock
    private AiConversationRepository conversationRepository;

    @Mock
    private AiMessageRepository messageRepository;

    @InjectMocks
    private AiConversationPersistenceService service;

    /** Message mới phải tham chiếu managed conversation do saveAndFlush trả về. */
    @Test
    void appendUserMessageUsesManagedConversation() {
        AiChatRequest request = AiChatRequest.builder()
                .conversationId("conv-test")
                .question("Quy định chấm công là gì?")
                .module("HR")
                .build();
        AiConversationEntity managed = AiConversationEntity.builder()
                .id("conv-test")
                .ownerId(1L)
                .scope(AiConversationScope.ADMIN_COPILOT)
                .title("Quy định chấm công")
                .module("HR")
                .build();
        when(conversationRepository.findById("conv-test")).thenReturn(Optional.empty());
        when(conversationRepository.saveAndFlush(any(AiConversationEntity.class)))
                .thenReturn(managed);

        service.appendUserMessage(
                1L, AiConversationScope.ADMIN_COPILOT, request, "Quy định chấm công");

        ArgumentCaptor<AiMessageEntity> captor = ArgumentCaptor.forClass(AiMessageEntity.class);
        verify(messageRepository).save(captor.capture());
        assertSame(managed, captor.getValue().getConversation());
    }
}
