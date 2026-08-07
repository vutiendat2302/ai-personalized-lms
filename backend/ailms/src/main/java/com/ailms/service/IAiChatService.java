package com.ailms.service;

import com.ailms.request.ai.AiChatRequest;
import reactor.core.publisher.Flux;

/**
 * Interface dịch vụ xử lý AI Chat streaming.
 */
public interface IAiChatService {

    /**
     * Stream câu trả lời của AI dưới dạng Flux SSE.
     */
    Flux<String> chatStream(AiChatRequest request);
}
