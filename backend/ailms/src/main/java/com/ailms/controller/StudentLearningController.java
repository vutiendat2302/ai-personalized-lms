package com.ailms.controller;

import com.ailms.request.UpdateProgressRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.response.LessonProgressResponse;
import com.ailms.service.IStudentLearningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller API Trải nghiệm học tập dành cho Học viên (Student Learning Experience):
 * - Xem cây nội dung khóa học kèm tiến độ cá nhân
 * - Cập nhật vị trí xem video & đánh dấu hoàn thành bài học
 */
@RestController
@RequestMapping("${api.prefix}/learn")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'ROLE_ADMIN')")
public class StudentLearningController {

    private final IStudentLearningService studentLearningService;

    /**
     * Lấy cây nội dung khóa học kèm tiến độ học tập cá nhân.
     */
    @GetMapping("/courses/{courseId}/tree")
    public ResponseEntity<ApiResponse<CourseCurriculumResponse>> getCourseTree(
            @PathVariable Long courseId,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(ApiResponse.of("Lấy cây bài học thành công", studentLearningService.getCourseTree(courseId, userId)));
    }

    /**
     * Cập nhật tiến độ xem video / vị trí dừng bài học.
     */
    @PutMapping("/lessons/{lessonId}/progress")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> updateLessonProgress(
            @PathVariable Long lessonId,
            @RequestParam Long userId,
            @RequestParam Long enrollmentId,
            @Valid @RequestBody UpdateProgressRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Cập nhật tiến độ thành công",
                studentLearningService.updateLessonProgress(lessonId, userId, enrollmentId, request)));
    }

    /**
     * Đánh dấu hoàn thành bài học (thủ công).
     */
    @PostMapping("/lessons/{lessonId}/complete")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> completeLesson(
            @PathVariable Long lessonId,
            @RequestParam Long userId,
            @RequestParam Long enrollmentId) {
        return ResponseEntity.ok(ApiResponse.of("Đánh dấu hoàn thành thành công",
                studentLearningService.completeLesson(lessonId, userId, enrollmentId)));
    }
}
