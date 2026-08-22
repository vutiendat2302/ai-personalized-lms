package com.ailms.controller;

import com.ailms.request.ai.PublicAiChatRequest;
import com.ailms.service.imp.PublicAiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import reactor.core.publisher.Flux;

/** SSE AI Chat công khai cho landing page, không gắn hội thoại với tài khoản. */
@RestController
@RequiredArgsConstructor
@RequestMapping("${api.prefix}/public/ai")
public class PublicAiChatController {
    private final PublicAiChatService publicAiChatService;

    /** Stream câu trả lời catalog và trả conversation ID để client tiếp tục phiên khách. */
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<Flux<String>> stream(@Valid @RequestBody PublicAiChatRequest request,
                                                HttpServletRequest httpRequest) {
        String clientKey = httpRequest.getRemoteAddr() == null ? "unknown" : httpRequest.getRemoteAddr();
        if (!publicAiChatService.allow(clientKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }
        String conversationId = request.getConversationId() == null || request.getConversationId().isBlank()
                ? publicAiChatService.newConversationId() : request.getConversationId();
        return ResponseEntity.ok().header("X-Conversation-Id", conversationId)
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body(publicAiChatService.stream(request, conversationId));
    }
}
