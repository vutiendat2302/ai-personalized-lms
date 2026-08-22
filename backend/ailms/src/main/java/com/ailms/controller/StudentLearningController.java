package com.ailms.controller;

import com.ailms.request.UpdateProgressRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.response.LessonProgressResponse;
import com.ailms.response.LessonPreviewResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.exception.UnauthorizedException;
import com.ailms.service.IStudentLearningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Controller API Trải nghiệm học tập dành cho Học viên (Student Learning Experience):
 * - Xem cây nội dung khóa học kèm tiến độ cá nhân
 * - Cập nhật vị trí xem video & đánh dấu hoàn thành bài học
 */
@RestController
@RequestMapping("${api.prefix}/learning")
@RequiredArgsConstructor
public class StudentLearningController {

    private final IStudentLearningService studentLearningService;

    /**
     * Lấy cây nội dung khóa học kèm tiến độ học tập cá nhân.
     */
    @GetMapping("/courses/{courseId}")
    public ResponseEntity<ApiResponse<CourseCurriculumResponse>> getCourseTree(
            @PathVariable Long courseId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        Long userId = currentUser != null ? currentUser.getUser().getId() : null;
        return ResponseEntity.ok(ApiResponse.of("Lấy cây bài học thành công", studentLearningService.getCourseTree(courseId, userId)));
    }

    /** Lấy nội dung một bài sau khi backend xác minh enrollment hoặc preview. */
    @GetMapping("/lessons/{lessonId}")
    public ResponseEntity<ApiResponse<LessonPreviewResponse>> getLesson(
            @PathVariable Long lessonId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        Long userId = currentUser != null ? currentUser.getUser().getId() : null;
        return ResponseEntity.ok(ApiResponse.of(
                "Lấy nội dung bài học thành công",
                studentLearningService.getAccessibleLesson(lessonId, userId)));
    }

    /**
     * Cập nhật tiến độ xem video / vị trí dừng bài học.
     */
    @PutMapping("/lessons/{lessonId}/progress")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> updateLessonProgress(
            @PathVariable Long lessonId,
            @RequestParam Long enrollmentId,
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody UpdateProgressRequest request) {
        Long userId = requireUserId(currentUser);
        return ResponseEntity.ok(ApiResponse.of("Cập nhật tiến độ thành công",
                studentLearningService.updateLessonProgress(lessonId, userId, enrollmentId, request)));
    }

    /**
     * Đánh dấu hoàn thành bài học (thủ công).
     */
    @PostMapping("/lessons/{lessonId}/complete")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> completeLesson(
            @PathVariable Long lessonId,
            @RequestParam Long enrollmentId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        Long userId = requireUserId(currentUser);
        return ResponseEntity.ok(ApiResponse.of("Đánh dấu hoàn thành thành công",
                studentLearningService.completeLesson(lessonId, userId, enrollmentId)));
    }

    /** Bắt buộc đăng nhập cho các API ghi tiến độ. */
    private Long requireUserId(CustomUserDetails currentUser) {
        if (currentUser == null || currentUser.getUser() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để lưu tiến độ học tập.");
        }
        return currentUser.getUser().getId();
    }
}
