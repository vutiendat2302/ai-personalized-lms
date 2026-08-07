package com.ailms.controller;

import com.ailms.request.ai.InsightsRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.ai.InsightsResponse;
import com.ailms.service.IAiInsightService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("${api.prefix}/ai-test")
@RequiredArgsConstructor
public class AiTestController {

    private final IAiInsightService aiInsightService;

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<InsightsResponse>> testInsights(@Valid @RequestBody InsightsRequest request) {
        InsightsResponse response = aiInsightService.getInsights(request);
        return ResponseEntity.ok(ApiResponse.of("Lấy AI insights thành công", response));
    }
}
