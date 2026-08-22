package com.ailms.controller;

import com.ailms.request.PublishClassQuizRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.QuizResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IClassQuizService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** API Teacher/Admin phát hành và quản lý Quiz riêng cho một lớp. */
@RestController
@RequestMapping("${api.prefix}/teacher/classes/{classId}/quizzes")
@RequiredArgsConstructor
public class ClassQuizController {
    private final IClassQuizService classQuizService;

    /** Phát hành Quiz nguồn vào lớp dưới dạng bản sao độc lập. */
    @PostMapping("/{sourceQuizId}/publish")
    @PreAuthorize("@classAccess.canManage(#classId, authentication)")
    public ResponseEntity<ApiResponse<QuizResponse>> publish(
            @PathVariable Long classId,
            @PathVariable Long sourceQuizId,
            @Valid @RequestBody PublishClassQuizRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Đã phát hành Quiz vào lớp",
                classQuizService.publish(classId, sourceQuizId, request, currentUser)));
    }

    /** Lấy danh sách Quiz đã phát hành của lớp. */
    @GetMapping
    @PreAuthorize("@classAccess.canManage(#classId, authentication)")
    public ResponseEntity<ApiResponse<List<QuizResponse>>> getByClass(
            @PathVariable Long classId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Lấy Quiz của lớp thành công",
                classQuizService.getByClass(classId, currentUser)));
    }

    /** Cập nhật lịch mở và hạn nộp của Quiz lớp. */
    @PatchMapping("/{classQuizId}")
    @PreAuthorize("@classAccess.canManage(#classId, authentication)")
    public ResponseEntity<ApiResponse<QuizResponse>> updateSchedule(
            @PathVariable Long classId,
            @PathVariable Long classQuizId,
            @Valid @RequestBody PublishClassQuizRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Đã cập nhật Quiz lớp",
                classQuizService.updateSchedule(classId, classQuizId, request, currentUser)));
    }

    /** Đóng Quiz lớp để chặn học viên bắt đầu hoặc nộp bài. */
    @PostMapping("/{classQuizId}/close")
    @PreAuthorize("@classAccess.canManage(#classId, authentication)")
    public ResponseEntity<ApiResponse<QuizResponse>> close(
            @PathVariable Long classId,
            @PathVariable Long classQuizId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Đã đóng Quiz lớp",
                classQuizService.close(classId, classQuizId, currentUser)));
    }
}
