package com.ailms.controller;

import com.ailms.request.ai.AiToolExecutionRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.ai.AiToolExecutionResponse;
import com.ailms.service.imp.AiToolAccessContext;
import com.ailms.service.imp.AiToolAccessTokenService;
import com.ailms.service.imp.ManagementAiContextService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Internal API để AI Service lấy context nghiệp vụ đã được Backend kiểm soát quyền. */
@RestController
@RequestMapping("${api.prefix}/ai/internal")
@RequiredArgsConstructor
public class ManagementAiToolController {

    private final AiToolAccessTokenService toolAccessTokenService;
    private final ManagementAiContextService managementAiContextService;

    /** Thực thi tool read-only sau khi xác minh internal token và access token ngắn hạn. */
    @PostMapping("/tools")
    public ResponseEntity<ApiResponse<AiToolExecutionResponse>> executeTool(
            @RequestHeader(value = "X-Internal-Token", required = false) String internalToken,
            @Valid @RequestBody AiToolExecutionRequest request) {
        toolAccessTokenService.verifyInternalToken(internalToken);
        AiToolAccessContext context = toolAccessTokenService.verify(request.getToolAccessToken());
        return ResponseEntity.ok(ApiResponse.of("Thực thi AI tool thành công",
                AiToolExecutionResponse.builder()
                        .toolName(request.getToolName())
                        .result(managementAiContextService.execute(
                                request.getToolName(), request.getArguments(), context))
                        .build()));
    }
}
