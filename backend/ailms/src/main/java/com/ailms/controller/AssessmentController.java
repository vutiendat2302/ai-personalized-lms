package com.ailms.controller;

import com.ailms.request.*;
import com.ailms.response.ApiResponse;
import com.ailms.response.StudentProgressReportResponse;
import com.ailms.response.SystemDashboardResponse;
import com.ailms.service.IAssessmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/assessments")
@RequiredArgsConstructor
public class AssessmentController {

    private final IAssessmentService assessmentService;

    @PostMapping("/quizzes/{id}/attempts")
    public ResponseEntity<ApiResponse<Long>> startQuizAttempt(
            @PathVariable Long id,
            @RequestParam Long userId) {
        Long attemptId = assessmentService.startQuizAttempt(userId, id);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Quiz attempt started", attemptId));
    }

    @PostMapping("/quiz-attempts/{id}/submit")
    public ResponseEntity<ApiResponse<Void>> submitQuizAttempt(
            @PathVariable Long id,
            @Valid @RequestBody SubmitQuizAttemptRequest request) {
        assessmentService.submitQuizAttempt(id, request);
        return ResponseEntity.ok(ApiResponse.message("Quiz attempt submitted successfully"));
    }

    @PostMapping("/quiz-attempts/{id}/grade")
    public ResponseEntity<ApiResponse<Void>> gradeFillInTheBlank(
            @PathVariable Long id,
            @Valid @RequestBody GradeFillInBlankRequest request) {
        assessmentService.gradeFillInTheBlank(id, request);
        return ResponseEntity.ok(ApiResponse.message("Fill-in-the-blank answers graded successfully"));
    }

    @PostMapping("/assignments")
    public ResponseEntity<ApiResponse<Long>> createAssignment(@Valid @RequestBody CreateAssignmentRequest request) {
        Long assignmentId = assessmentService.createAssignment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Assignment created successfully", assignmentId));
    }

    @PostMapping("/assignments/{id}/submissions")
    public ResponseEntity<ApiResponse<Long>> submitAssignment(
            @PathVariable Long id,
            @RequestParam Long userId,
            @Valid @RequestBody SubmitAssignmentRequest request) {
        Long submissionId = assessmentService.submitAssignment(userId, id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Assignment submitted successfully", submissionId));
    }

    @PostMapping("/submissions/{id}/grade")
    public ResponseEntity<ApiResponse<Void>> gradeSubmission(
            @PathVariable Long id,
            @RequestParam Long teacherUserId,
            @Valid @RequestBody GradeSubmissionRequest request) {
        assessmentService.gradeSubmission(id, request, teacherUserId);
        return ResponseEntity.ok(ApiResponse.message("Submission graded successfully"));
    }

    @GetMapping("/reports/class-progress")
    public ResponseEntity<ApiResponse<List<StudentProgressReportResponse>>> getClassProgressReport(
            @RequestParam Long classId,
            @RequestParam Long teacherUserId) {
        List<StudentProgressReportResponse> report = assessmentService.getClassProgressReport(classId, teacherUserId);
        return ResponseEntity.ok(ApiResponse.of("Class progress report retrieved successfully", report));
    }

    @GetMapping("/reports/system-dashboard")
    public ResponseEntity<ApiResponse<SystemDashboardResponse>> getSystemDashboardReport(@RequestParam(required = false) Long categoryId) {
        SystemDashboardResponse report = assessmentService.getSystemDashboardReport(categoryId);
        return ResponseEntity.ok(ApiResponse.of("System dashboard report retrieved successfully", report));
    }
}
