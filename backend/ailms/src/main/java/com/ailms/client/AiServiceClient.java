package com.ailms.client;

import com.ailms.request.ai.InsightsRequest;
import com.ailms.response.ai.InsightsResponse;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

/**
 * HTTP Client giao tiếp với ai-service.
 */
@HttpExchange
public interface AiServiceClient {

    /**
     * Gửi yêu cầu sinh văn bản test thử nghiệm từ ai-service.
     */
    @PostExchange("/test/generate")
    InsightsResponse getInsights(@RequestBody InsightsRequest request);
}
