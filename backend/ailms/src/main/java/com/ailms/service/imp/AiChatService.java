package com.ailms.service.imp;

import com.ailms.client.AiServiceClient;
import com.ailms.request.ai.AiChatRequest;
import com.ailms.service.IAiChatService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

/**
 * Service chuyển tiếp cuộc hội thoại stream tới AI Service qua WebClient streaming proxy.
 */
@Service
public class AiChatService implements IAiChatService {

    private final AiServiceClient streamingClient;

    public AiChatService(@Qualifier("aiServiceStreamingClient") AiServiceClient streamingClient) {
        this.streamingClient = streamingClient;
    }

    @Override
    public Flux<String> chatStream(AiChatRequest request) {
        return streamingClient.chatStream(request);
    }
}
