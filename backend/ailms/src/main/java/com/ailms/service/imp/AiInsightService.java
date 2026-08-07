package com.ailms.service.imp;

import com.ailms.client.AiServiceClient;
import com.ailms.request.ai.InsightsRequest;
import com.ailms.response.ai.InsightsResponse;
import com.ailms.service.IAiInsightService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiInsightService implements IAiInsightService {

    private final AiServiceClient aiServiceClient;

    @Override
    public InsightsResponse getInsights(InsightsRequest request) {
        log.info("Gọi AI Service lấy insights...");
        return aiServiceClient.getInsights(request);
    }
}
