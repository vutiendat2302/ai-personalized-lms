package com.ailms.controller;

import com.ailms.request.ai.AiChatRequest;
import com.ailms.service.IAiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

/**
 * Controller tiếp nhận yêu cầu stream AI chat từ Frontend.
 */
@RestController
@RequestMapping("${api.prefix}/admin/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final IAiChatService aiChatService;

    @PostMapping(
            value = "/chat/stream" ,
            produces = MediaType.TEXT_EVENT_STREAM_VALUE
    )
    public Flux<String> chatStream(@Valid @RequestBody AiChatRequest request) {
        return aiChatService.chatStream(request);
    }
}
