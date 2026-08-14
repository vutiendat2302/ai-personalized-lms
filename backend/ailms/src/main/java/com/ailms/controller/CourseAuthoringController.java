package com.ailms.controller;

import com.ailms.request.*;
import com.ailms.response.*;
import com.ailms.service.ICourseAuthoringService;
import com.ailms.service.imp.AiAssessmentAuthoringService;
import com.ailms.request.ai.AiAssessmentApplyRequest;
import com.ailms.response.ai.AiAssessmentApplyResponse;
import com.ailms.response.ai.AiAssessmentDraftResponse;
import com.ailms.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
    private final AiAssessmentAuthoringService aiAssessmentAuthoringService;

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

    // ────────────── AI ASSESSMENT DRAFT ──────────────

    /** Sinh draft quiz/assignment từ block lesson và tối đa ba file nguồn, chưa lưu assessment thật. */
    @PostMapping(value = "/lessons/{lessonId}/ai-assessment-drafts", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AiAssessmentDraftResponse>> generateAssessmentDraft(
            @PathVariable Long lessonId,
            @RequestParam(value = "assessmentType", required = false) String assessmentType,
            @RequestParam(value = "questionCount", required = false) Integer questionCount,
            @RequestPart(value = "materials", required = false) MultipartFile[] materials,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Đã tạo draft assessment AI, hãy xem và xác nhận trước khi lưu",
                aiAssessmentAuthoringService.generateDraft(
                        lessonId, assessmentType, questionCount, materials, currentUser)));
    }

    /** Áp dụng một lần draft đã xem vào quiz/assignment block thật của lesson. */
    @PostMapping("/ai-assessment-drafts/{draftId}/apply")
    public ResponseEntity<ApiResponse<AiAssessmentApplyResponse>> applyAssessmentDraft(
            @PathVariable String draftId,
            @Valid @RequestBody AiAssessmentApplyRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Đã tạo assessment từ draft AI", aiAssessmentAuthoringService
                        .applyDraft(draftId, request, currentUser)));
    }

    // ────────────── WORKFLOW & APPROVAL ──────────────

    @PostMapping("/courses/{courseId}/submit")
    public ResponseEntity<ApiResponse<CourseResponse>> submitForReview(@PathVariable Long courseId) {
        return ResponseEntity.ok(ApiResponse.of("Gửi duyệt khóa học thành công", courseAuthoringService.submitForReview(courseId)));
    }

    @PostMapping("/courses/{courseId}/cancel-review")
    public ResponseEntity<ApiResponse<CourseResponse>> cancelReviewRequest(@PathVariable Long courseId) {
        return ResponseEntity.ok(ApiResponse.of("Đã hủy yêu cầu gửi duyệt khóa học thành công", courseAuthoringService.cancelReviewRequest(courseId)));
    }

    @PostMapping("/courses/{courseId}/request-edit")
    public ResponseEntity<ApiResponse<CourseResponse>> requestEditActiveCourse(@PathVariable Long courseId) {
        return ResponseEntity.ok(ApiResponse.of("Đã chuyển khóa học sang Chế độ chỉnh sửa thành công", courseAuthoringService.requestEditActiveCourse(courseId)));
    }

    // ────────────── CO-INSTRUCTORS ──────────────

    @GetMapping("/teachers/search")
    public ResponseEntity<ApiResponse<List<TeacherOptionResponse>>> searchTeachers(@RequestParam(required = false) String query) {
        return ResponseEntity.ok(ApiResponse.of("Tìm kiếm giảng viên thành công", courseAuthoringService.searchTeachers(query)));
    }

    @PostMapping("/courses/{courseId}/instructors/invite")
    public ResponseEntity<ApiResponse<CourseInstructorResponse>> inviteInstructor(
            @PathVariable Long courseId,
            @Valid @RequestBody InviteInstructorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Đã gửi lời mời giảng viên phụ trách thành công", courseAuthoringService.inviteInstructor(courseId, request)));
    }

    @GetMapping("/courses/{courseId}/instructors")
    public ResponseEntity<ApiResponse<List<CourseInstructorResponse>>> getCourseInstructors(@PathVariable Long courseId) {
        return ResponseEntity.ok(ApiResponse.of("Lấy danh sách giảng viên phụ trách thành công", courseAuthoringService.getCourseInstructors(courseId)));
    }

    @DeleteMapping("/courses/{courseId}/instructors/{instructorId}")
    public ResponseEntity<ApiResponse<Void>> removeInstructor(
            @PathVariable Long courseId,
            @PathVariable Long instructorId) {
        courseAuthoringService.removeInstructor(courseId, instructorId);
        return ResponseEntity.ok(ApiResponse.message("Đã xóa giảng viên phụ trách thành công"));
    }

    @PostMapping("/courses/instructors/invitations/{invitationId}/respond")
    public ResponseEntity<ApiResponse<CourseInstructorResponse>> respondInvitation(
            @PathVariable Long invitationId,
            @RequestParam boolean accept) {
        return ResponseEntity.ok(ApiResponse.of("Phản hồi lời mời thành công", courseAuthoringService.respondInvitation(invitationId, accept)));
    }

    @GetMapping("/courses/instructors/my-invitations")
    public ResponseEntity<ApiResponse<List<CourseInstructorResponse>>> getMyInvitations() {
        return ResponseEntity.ok(ApiResponse.of("Lấy danh sách lời mời thành công", courseAuthoringService.getMyInvitations()));
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
