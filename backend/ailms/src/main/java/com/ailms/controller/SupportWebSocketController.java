package com.ailms.controller;

import com.ailms.request.support.SupportMessageRequest;
import com.ailms.request.support.SupportSocketMessage;
import com.ailms.request.support.SupportTypingSocketMessage;
import com.ailms.response.support.SupportTypingResponse;
import com.ailms.entity.enums.SupportMessageSenderEnum;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.ISupportChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/** STOMP controller lưu message trước rồi broadcast cho đúng hai đầu cuộc chat. */
@Controller
@RequiredArgsConstructor
public class SupportWebSocketController {
    private final ISupportChatService supportChatService;
    private final SimpMessagingTemplate messagingTemplate;

    /** Nhận tin nhắn visitor hoặc SUPPORT và phát lại trên topic conversation. */
    @MessageMapping("/support/{conversationId}/message")
    public void message(@DestinationVariable Long conversationId, @Valid SupportSocketMessage request,
                        Principal principal) {
        if (principal.getName().startsWith("visitor:")) {
            supportChatService.sendVisitorMessageByVisitorId(conversationId,
                    principal.getName().substring("visitor:".length()),
                    new SupportMessageRequest(request.content()));
        } else if (principal instanceof Authentication authentication
                && authentication.getPrincipal() instanceof CustomUserDetails currentUser) {
            supportChatService.sendHrMessage(conversationId, currentUser,
                    new SupportMessageRequest(request.content()));
        } else {
            throw new IllegalArgumentException("Invalid support principal");
        }
    }

    /** Phát typing realtime cho đầu còn lại mà không tạo bản ghi message trong database. */
    @MessageMapping("/support/{conversationId}/typing")
    public void typing(@DestinationVariable Long conversationId, @Valid SupportTypingSocketMessage request,
                       Principal principal) {
        SupportMessageSenderEnum senderType;
        if (principal.getName().startsWith("visitor:")) {
            senderType = SupportMessageSenderEnum.VISITOR;
        } else if (principal instanceof Authentication authentication
                && authentication.getPrincipal() instanceof CustomUserDetails) {
            senderType = SupportMessageSenderEnum.HR;
        } else {
            throw new IllegalArgumentException("Invalid support principal");
        }
        messagingTemplate.convertAndSend("/topic/support/" + conversationId + "/typing",
                new SupportTypingResponse(senderType, request.typing()));
    }
}
