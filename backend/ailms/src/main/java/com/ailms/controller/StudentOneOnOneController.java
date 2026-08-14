package com.ailms.controller;

import com.ailms.exception.UnauthorizedException;
import com.ailms.request.OneOnOneTrialResultRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.OneOnOneRequestResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IOneOnOneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** API học viên theo dõi và xác nhận kết quả học thử 1-1. */
@RestController
@RequestMapping("${api.prefix}/students/one-on-one/requests")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'ROLE_ADMIN')")
public class StudentOneOnOneController {

    private final IOneOnOneService oneOnOneService;

    /** Lấy các yêu cầu 1-1 thuộc người dùng hiện tại. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<OneOnOneRequestResponse>>> getRequests(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of(
                "One-on-one requests retrieved successfully",
                oneOnOneService.getStudentRequests(requireUserId(currentUser))));
    }

    /** Xác nhận tiếp tục hoặc yêu cầu ghép lại sau học thử. */
    @PostMapping("/{requestId}/trial-result")
    public ResponseEntity<ApiResponse<OneOnOneRequestResponse>> submitTrialResult(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long requestId,
            @Valid @RequestBody OneOnOneTrialResultRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                "Trial result processed successfully",
                oneOnOneService.submitTrialResult(requireUserId(currentUser), requestId, request)));
    }

    /** Lấy ID người dùng đã đăng nhập. */
    private Long requireUserId(CustomUserDetails currentUser) {
        if (currentUser == null || currentUser.getUser() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập.");
        }
        return currentUser.getUser().getId();
    }
}
