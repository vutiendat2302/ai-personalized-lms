package com.ailms.controller;

import com.ailms.request.ai.AiToolExecutionRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.ai.AiToolExecutionResponse;
import com.ailms.entity.UserEntity;
import com.ailms.repository.UserRepository;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.imp.AiToolAccessContext;
import com.ailms.service.imp.AiToolAccessTokenService;
import com.ailms.service.imp.ManagementAiContextService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

/** Internal API để AI Service lấy context nghiệp vụ đã được Backend kiểm soát quyền. */
@RestController
@RequestMapping("${api.prefix}/ai/internal")
@RequiredArgsConstructor
public class ManagementAiToolController {

    private final AiToolAccessTokenService toolAccessTokenService;
    private final ManagementAiContextService managementAiContextService;
    private final UserRepository userRepository;

    /** Thực thi tool read-only sau khi xác minh internal token và access token ngắn hạn. */
    @PostMapping("/tools")
    public ResponseEntity<ApiResponse<AiToolExecutionResponse>> executeTool(
            @RequestHeader(value = "X-Internal-Token", required = false) String internalToken,
            @Valid @RequestBody AiToolExecutionRequest request) {
        toolAccessTokenService.verifyInternalToken(internalToken);
        AiToolAccessContext context = toolAccessTokenService.verify(request.getToolAccessToken());
        Authentication previousAuthentication = SecurityContextHolder.getContext().getAuthentication();
        try {
            installToolAuthentication(context);
            return ResponseEntity.ok(ApiResponse.of("Thực thi AI tool thành công",
                    AiToolExecutionResponse.builder()
                            .toolName(request.getToolName())
                            .result(managementAiContextService.execute(
                                    request.getToolName(), request.getArguments(), context))
                            .build()));
        } finally {
            restoreAuthentication(previousAuthentication);
        }
    }

    /** Dựng SecurityContext từ token đã được Backend ký để nghiệp vụ dùng đúng owner. */
    private void installToolAuthentication(AiToolAccessContext context) {
        UserEntity user = userRepository.findById(context.ownerId())
                .orElseThrow(() -> new IllegalStateException("Không tìm thấy người dùng của AI tool"));
        List<SimpleGrantedAuthority> authorities = context.roles().stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
        CustomUserDetails details = new CustomUserDetails(user, authorities);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                details, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    /** Khôi phục SecurityContext của request sau khi AI tool chạy xong. */
    private void restoreAuthentication(Authentication previousAuthentication) {
        if (previousAuthentication == null) {
            SecurityContextHolder.clearContext();
            return;
        }
        SecurityContextHolder.getContext().setAuthentication(previousAuthentication);
    }
}
