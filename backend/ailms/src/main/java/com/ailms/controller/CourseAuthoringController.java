package com.ailms.controller;

import com.ailms.request.*;
import com.ailms.response.*;
import com.ailms.service.ICourseAuthoringService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller API Quản trị Tác giả Khóa học (Course Authoring Studio):
 * - Dành cho Giảng viên và Quản trị viên
 * - Quản lý chương, bài học, bài kiểm tra (Quiz 3 cấp) và bài tập (Assignment 3 cấp)
 */
@RestController
@RequestMapping("${api.prefix}/authoring")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_TEACHER')")
public class CourseAuthoringController {

    private final ICourseAuthoringService courseAuthoringService;

    // ────────────── CURRICULUM TREE ──────────────

    @GetMapping("/courses/{courseId}/curriculum")
    public ResponseEntity<ApiResponse<CourseCurriculumResponse>> getCurriculum(@PathVariable Long courseId) {
        return ResponseEntity.ok(ApiResponse.of("Lấy cây nội dung thành công", courseAuthoringService.getCurriculum(courseId)));
    }

    // ────────────── SECTION CRUD ──────────────

    @PostMapping("/courses/{courseId}/sections")
    public ResponseEntity<ApiResponse<SectionResponse>> addSection(
            @PathVariable Long courseId,
            @Valid @RequestBody CreateSectionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Tạo chương học thành công", courseAuthoringService.addSection(courseId, request)));
    }

    @PutMapping("/sections/{sectionId}")
    public ResponseEntity<ApiResponse<SectionResponse>> updateSection(
            @PathVariable Long sectionId,
            @Valid @RequestBody UpdateSectionRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Cập nhật chương học thành công", courseAuthoringService.updateSection(sectionId, request)));
    }

    @DeleteMapping("/sections/{sectionId}")
    public ResponseEntity<ApiResponse<Void>> deleteSection(@PathVariable Long sectionId) {
        courseAuthoringService.deleteSection(sectionId);
        return ResponseEntity.ok(ApiResponse.message("Xóa chương học thành công"));
    }

    @PatchMapping("/courses/{courseId}/sections/reorder")
    public ResponseEntity<ApiResponse<Void>> reorderSections(
            @PathVariable Long courseId,
            @Valid @RequestBody ReorderRequest request) {
        courseAuthoringService.reorderSections(courseId, request);
        return ResponseEntity.ok(ApiResponse.message("Sắp xếp chương học thành công"));
    }

    // ────────────── LESSON CRUD ──────────────

    @PostMapping("/sections/{sectionId}/lessons")
    public ResponseEntity<ApiResponse<LessonResponse>> addLesson(
            @PathVariable Long sectionId,
            @Valid @RequestBody CreateLessonRequest request) {
        request.setSectionId(sectionId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Tạo bài học thành công", courseAuthoringService.addLesson(sectionId, request)));
    }

    @PutMapping("/lessons/{lessonId}")
    public ResponseEntity<ApiResponse<LessonResponse>> updateLesson(
            @PathVariable Long lessonId,
            @Valid @RequestBody UpdateLessonRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Cập nhật bài học thành công", courseAuthoringService.updateLesson(lessonId, request)));
    }

    @DeleteMapping("/lessons/{lessonId}")
    public ResponseEntity<ApiResponse<Void>> deleteLesson(@PathVariable Long lessonId) {
        courseAuthoringService.deleteLesson(lessonId);
        return ResponseEntity.ok(ApiResponse.message("Xóa bài học thành công"));
    }

    @PatchMapping("/sections/{sectionId}/lessons/reorder")
    public ResponseEntity<ApiResponse<Void>> reorderLessons(
            @PathVariable Long sectionId,
            @Valid @RequestBody ReorderRequest request) {
        courseAuthoringService.reorderLessons(sectionId, request);
        return ResponseEntity.ok(ApiResponse.message("Sắp xếp bài học thành công"));
    }

    // ────────────── QUIZ ──────────────

    @PostMapping("/quizzes")
    public ResponseEntity<ApiResponse<QuizResponse>> createQuiz(@Valid @RequestBody QuizRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Tạo bài kiểm tra Quiz thành công", courseAuthoringService.createQuiz(request)));
    }

    @PutMapping("/quizzes/{quizId}")
    public ResponseEntity<ApiResponse<QuizResponse>> updateQuiz(
            @PathVariable Long quizId,
            @Valid @RequestBody QuizRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Cập nhật bài kiểm tra Quiz thành công", courseAuthoringService.updateQuiz(quizId, request)));
    }

    // ────────────── ASSIGNMENT ──────────────

    @PostMapping("/assignments")
    public ResponseEntity<ApiResponse<AssignmentResponse>> createAssignment(@Valid @RequestBody CreateAssignmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Tạo bài tập tự luận Assignment thành công", courseAuthoringService.createAssignment(request)));
    }

    @PutMapping("/assignments/{assignmentId}")
    public ResponseEntity<ApiResponse<AssignmentResponse>> updateAssignment(
            @PathVariable Long assignmentId,
            @Valid @RequestBody AssignmentRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Cập nhật bài tập tự luận Assignment thành công", courseAuthoringService.updateAssignment(assignmentId, request)));
    }

    // ────────────── WORKFLOW ──────────────

    @PostMapping("/courses/{courseId}/submit")
    public ResponseEntity<ApiResponse<CourseResponse>> submitForReview(@PathVariable Long courseId) {
        return ResponseEntity.ok(ApiResponse.of("Gửi duyệt khóa học thành công", courseAuthoringService.submitForReview(courseId)));
    }

    // ────────────── GRADING ──────────────

    @GetMapping("/assignments/{assignmentId}/submissions")
    public ResponseEntity<ApiResponse<List<SubmissionResponse>>> getSubmissionsForGrading(@PathVariable Long assignmentId) {
        return ResponseEntity.ok(ApiResponse.of("Lấy danh sách bài nộp thành công", courseAuthoringService.getSubmissionsForGrading(assignmentId)));
    }

    @PutMapping("/submissions/{submissionId}/grade")
    public ResponseEntity<ApiResponse<SubmissionResponse>> gradeSubmission(
            @PathVariable Long submissionId,
            @Valid @RequestBody GradeSubmissionWithFeedbackRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Chấm điểm bài nộp thành công", courseAuthoringService.gradeSubmission(submissionId, request)));
    }
}
