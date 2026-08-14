package com.ailms.controller;

import com.ailms.request.ai.AiNotificationConfirmRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.ai.AiNotificationDraftResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.imp.AiNotificationActionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** API xác nhận action gửi thông báo do AI đề xuất, không cho Gemini tự gọi trực tiếp. */
@RestController
@RequestMapping("${api.prefix}/ai/actions/notifications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AiNotificationActionController {

    private final AiNotificationActionService aiNotificationActionService;

    /** Gửi một draft đúng owner sau khi Admin nhập xác nhận rõ ràng. */
    @PostMapping("/{draftId}/confirm")
    public ResponseEntity<ApiResponse<AiNotificationDraftResponse>> confirm(
            @PathVariable String draftId,
            @Valid @RequestBody AiNotificationConfirmRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        AiNotificationDraftResponse response = aiNotificationActionService.confirmAndSend(
                draftId, currentUser.getUser().getId());
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.of("Thông báo đã được đưa vào hàng đợi gửi", response));
    }
}
