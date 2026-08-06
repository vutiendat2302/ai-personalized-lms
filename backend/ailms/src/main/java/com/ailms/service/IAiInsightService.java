package com.ailms.service;

import com.ailms.request.ai.InsightsRequest;
import com.ailms.response.ai.InsightsResponse;

public interface IAiInsightService {
    InsightsResponse getInsights(InsightsRequest request);
}
