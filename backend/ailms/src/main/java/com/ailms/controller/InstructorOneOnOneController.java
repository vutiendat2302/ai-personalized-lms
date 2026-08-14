package com.ailms.controller;

import com.ailms.exception.UnauthorizedException;
import com.ailms.request.OneOnOneTrialClassRequest;
import com.ailms.request.OneOnOneTrialReviewRequest;
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

/** API giáo viên/trợ giảng nhận matching và tự quản lý buổi thử 1-1. */
@RestController
@RequestMapping("${api.prefix}/instructors/one-on-one")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_TEACHER', 'ROLE_TA', 'ROLE_ADMIN')")
public class InstructorOneOnOneController {

    private final IOneOnOneService oneOnOneService;

    /** Lấy gợi ý không chứa thông tin liên hệ cá nhân của học viên. */
    @GetMapping("/suggestions")
    public ResponseEntity<ApiResponse<List<OneOnOneRequestResponse>>> getSuggestions(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of(
                "One-on-one suggestions retrieved successfully",
                oneOnOneService.getSuggestions(requireUserId(currentUser))));
    }

    /** Nhận độc quyền một yêu cầu đang chờ hoặc rematching. */
    @PostMapping("/requests/{requestId}/accept")
    public ResponseEntity<ApiResponse<OneOnOneRequestResponse>> accept(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long requestId) {
        return ResponseEntity.ok(ApiResponse.of(
                "One-on-one request accepted successfully",
                oneOnOneService.accept(requireUserId(currentUser), requestId)));
    }

    /** Tạo lớp và một buổi học thử trong cùng transaction. */
    @PostMapping("/requests/{requestId}/trial-class")
    public ResponseEntity<ApiResponse<OneOnOneRequestResponse>> createTrialClass(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long requestId,
            @Valid @RequestBody OneOnOneTrialClassRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                "Trial class and session created successfully",
                oneOnOneService.createTrialClass(requireUserId(currentUser), requestId, request)));
    }

    /** Trả buổi thử đã tạo và chặn tạo lặp. */
    @PostMapping("/requests/{requestId}/trial-session")
    public ResponseEntity<ApiResponse<OneOnOneRequestResponse>> getTrialSession(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long requestId) {
        return ResponseEntity.ok(ApiResponse.of(
                "Trial session retrieved successfully",
                oneOnOneService.getOrCreateTrialSession(requireUserId(currentUser), requestId)));
    }

    /** Hoàn tất nhận xét sau khi buổi thử kết thúc. */
    @PostMapping("/requests/{requestId}/trial-review")
    public ResponseEntity<ApiResponse<OneOnOneRequestResponse>> reviewTrial(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long requestId,
            @Valid @RequestBody OneOnOneTrialReviewRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                "Trial review submitted successfully",
                oneOnOneService.reviewTrial(requireUserId(currentUser), requestId, request)));
    }

    /** Lấy ID người dạy đã đăng nhập. */
    private Long requireUserId(CustomUserDetails currentUser) {
        if (currentUser == null || currentUser.getUser() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập.");
        }
        return currentUser.getUser().getId();
    }
}
