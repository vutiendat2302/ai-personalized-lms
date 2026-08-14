package com.ailms.controller;

import com.ailms.exception.UnauthorizedException;
import com.ailms.request.TeacherWorkspaceRequest;
import com.ailms.request.AssignmentRequest;
import com.ailms.request.AssignmentSearchRequest;
import com.ailms.request.QuizRequest;
import com.ailms.request.QuizSearchRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.AssignmentResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.QuizResponse;
import com.ailms.response.TeacherWorkspaceResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.ITeacherWorkspaceService;
import com.ailms.service.ITeacherActivityService;
import com.ailms.service.IAssignmentService;
import com.ailms.service.IQuizService;
import com.ailms.response.NotificationResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** API workspace lấy dữ liệu thật và luôn giới hạn theo Teacher/TA trong JWT. */
@RestController
@RequestMapping("${api.prefix}/teacher")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_TEACHER', 'ROLE_TA', 'ROLE_ADMIN')")
public class TeacherController {

    private final ITeacherWorkspaceService teacherWorkspaceService;
    private final ITeacherActivityService teacherActivityService;
    private final IQuizService quizService;
    private final IAssignmentService assignmentService;

    /** Kiểm tra điều kiện đã được gán chuyên môn. */
    @GetMapping("/categories/prerequisite")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkPrerequisiteCategory(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        boolean assigned = teacherWorkspaceService.hasAssignedCategory(requireUserId(currentUser));
        return ResponseEntity.ok(ApiResponse.of("Teacher category prerequisite retrieved successfully",
                Map.of("hasAssignedCategory", assigned)));
    }

    /** Lấy toàn bộ KPI dashboard của user hiện tại. */
    @GetMapping("/dashboard/metrics")
    public ResponseEntity<ApiResponse<TeacherWorkspaceResponse.Metrics>> getDashboardMetrics(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Dashboard metrics retrieved successfully",
                teacherWorkspaceService.getMetrics(requireUserId(currentUser))));
    }

    /** Lấy ca dạy hôm nay và buổi trong 24 giờ đang chờ nhận xét. */
    @GetMapping("/dashboard/agenda")
    public ResponseEntity<ApiResponse<List<TeacherWorkspaceResponse.AgendaSession>>> getAgenda(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Agenda retrieved successfully",
                teacherWorkspaceService.getAgenda(requireUserId(currentUser))));
    }

    /** Lấy tối đa năm hoạt động lớp học mới nhất để hiển thị dashboard. */
    @GetMapping("/dashboard/activities")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getLatestActivities(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Latest teaching activities retrieved successfully",
                teacherActivityService.getLatest(requireUserId(currentUser), 5)));
    }

    /** Lấy lịch tuần/tháng bằng khoảng ngày from-to, mặc định tuần hiện tại. */
    @GetMapping("/sessions/online")
    public ResponseEntity<ApiResponse<List<TeacherWorkspaceResponse.OnlineSession>>> getOnlineSessions(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.of("Online sessions retrieved successfully",
                teacherWorkspaceService.getOnlineSessions(requireUserId(currentUser), from, to)));
    }

    /** Gửi nhận xét sau buổi học và kích hoạt tính draft thù lao khi đủ cấu hình. */
    @PostMapping("/sessions/{id}/review")
    public ResponseEntity<ApiResponse<Void>> submitSessionReview(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long id,
            @Valid @RequestBody TeacherWorkspaceRequest.SessionReview request) {
        teacherWorkspaceService.reviewSession(requireUserId(currentUser), id, request);
        return ResponseEntity.ok(ApiResponse.message("Session review submitted successfully"));
    }

    /** Lấy hàng đợi assignment chưa chấm. */
    @GetMapping("/grading/assignments")
    public ResponseEntity<ApiResponse<List<TeacherWorkspaceResponse.SubmissionQueueItem>>> getGradingAssignments(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Assignment grading queue retrieved successfully",
                teacherWorkspaceService.getPendingSubmissions(requireUserId(currentUser))));
    }

    /** Chấm một bài nộp assignment. */
    @PostMapping({"/grading/assignments/{id}", "/submissions/{id}/grade"})
    public ResponseEntity<ApiResponse<Void>> gradeSubmission(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long id,
            @Valid @RequestBody TeacherWorkspaceRequest.SubmissionGrade request) {
        teacherWorkspaceService.gradeSubmission(requireUserId(currentUser), id, request);
        return ResponseEntity.ok(ApiResponse.message("Submission graded successfully"));
    }

    /** Lấy các câu quiz/bài thi cần chấm tay. */
    @GetMapping("/grading/quizzes/fill-blank")
    public ResponseEntity<ApiResponse<List<TeacherWorkspaceResponse.FillBlankQueueItem>>> getFillBlankQuizzes(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Fill blank grading queue retrieved successfully",
                teacherWorkspaceService.getPendingQuizAnswers(requireUserId(currentUser))));
    }

    /** Chấm một câu quiz tự luận theo answer ID. */
    @PostMapping("/grading/quizzes/fill-blank/{id}")
    public ResponseEntity<ApiResponse<Void>> gradeFillBlankQuestion(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long id,
            @Valid @RequestBody TeacherWorkspaceRequest.AnswerGrade request) {
        teacherWorkspaceService.gradeQuizAnswer(requireUserId(currentUser), id, request);
        return ResponseEntity.ok(ApiResponse.message("Fill blank answer graded successfully"));
    }

    /** Lấy thống kê tỷ lệ sai của câu hỏi thuộc quiz được quản lý. */
    @GetMapping("/grading/quizzes/difficulty-stats")
    public ResponseEntity<ApiResponse<List<TeacherWorkspaceResponse.QuestionDifficulty>>> getQuestionDifficultyStats(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Question difficulty statistics retrieved successfully",
                teacherWorkspaceService.getQuestionDifficulty(requireUserId(currentUser))));
    }

    /** Lấy quiz, bài thi và assignment do chính Teacher/TA tạo. */
    @GetMapping("/assessments/authored")
    public ResponseEntity<ApiResponse<List<TeacherWorkspaceResponse.AuthoredAssessment>>> getAuthoredAssessments(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(ApiResponse.of("Authored assessments retrieved successfully",
                teacherWorkspaceService.getAuthoredAssessments(requireUserId(currentUser), type)));
    }

    /** Alias danh sách quiz/bài thi do chính user tạo. */
    @GetMapping("/quizzes/authored")
    public ResponseEntity<ApiResponse<List<TeacherWorkspaceResponse.AuthoredAssessment>>> getAuthoredQuizzes(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Authored quizzes and exams retrieved successfully",
                teacherWorkspaceService.getAuthoredAssessments(requireUserId(currentUser), "QUIZ_OR_EXAM")));
    }

    /** Tìm kiếm quiz do chính Teacher/TA hiện tại tạo. */
    @GetMapping("/assessment-library/quizzes/search")
    public ResponseEntity<ApiResponse<PageResponse<QuizResponse>>> searchAuthoredQuizzes(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            QuizSearchRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Authored quizzes retrieved successfully",
                quizService.searchAuthored(request, requireUserId(currentUser))));
    }

    /** Lấy chi tiết quiz do chính Teacher/TA hiện tại tạo. */
    @GetMapping("/assessment-library/quizzes/{id}")
    public ResponseEntity<ApiResponse<QuizResponse>> getAuthoredQuiz(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Authored quiz retrieved successfully",
                quizService.getAuthoredById(id, requireUserId(currentUser))));
    }

    /** Tạo quiz và lấy createdBy từ JWT. */
    @PostMapping("/assessment-library/quizzes")
    public ResponseEntity<ApiResponse<QuizResponse>> createAuthoredQuiz(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody QuizRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Quiz created successfully",
                quizService.createForAuthor(request, requireUserId(currentUser))));
    }

    /** Cập nhật quiz nếu người dùng hiện tại là người tạo. */
    @PutMapping("/assessment-library/quizzes/{id}")
    public ResponseEntity<ApiResponse<QuizResponse>> updateAuthoredQuiz(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long id,
            @Valid @RequestBody QuizRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Quiz updated successfully",
                quizService.updateAuthored(id, request, requireUserId(currentUser))));
    }

    /** Xóa quiz nếu người dùng hiện tại là người tạo. */
    @DeleteMapping("/assessment-library/quizzes/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAuthoredQuiz(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long id) {
        quizService.deleteAuthored(id, requireUserId(currentUser));
        return ResponseEntity.ok(ApiResponse.message("Quiz deleted successfully"));
    }

    /** Tìm kiếm bài tập do chính Teacher/TA hiện tại tạo. */
    @GetMapping("/assessment-library/assignments/search")
    public ResponseEntity<ApiResponse<PageResponse<AssignmentResponse>>> searchAuthoredAssignments(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            AssignmentSearchRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Authored assignments retrieved successfully",
                assignmentService.searchAuthored(request, requireUserId(currentUser))));
    }

    /** Lấy chi tiết bài tập do chính Teacher/TA hiện tại tạo. */
    @GetMapping("/assessment-library/assignments/{id}")
    public ResponseEntity<ApiResponse<AssignmentResponse>> getAuthoredAssignment(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Authored assignment retrieved successfully",
                assignmentService.getAuthoredById(id, requireUserId(currentUser))));
    }

    /** Tạo bài tập và lấy createdBy từ JWT. */
    @PostMapping("/assessment-library/assignments")
    public ResponseEntity<ApiResponse<AssignmentResponse>> createAuthoredAssignment(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody AssignmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Assignment created successfully",
                assignmentService.createForAuthor(request, requireUserId(currentUser))));
    }

    /** Cập nhật bài tập nếu người dùng hiện tại là người tạo. */
    @PutMapping("/assessment-library/assignments/{id}")
    public ResponseEntity<ApiResponse<AssignmentResponse>> updateAuthoredAssignment(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long id,
            @Valid @RequestBody AssignmentRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Assignment updated successfully",
                assignmentService.updateAuthored(id, request, requireUserId(currentUser))));
    }

    /** Xóa bài tập nếu người dùng hiện tại là người tạo. */
    @DeleteMapping("/assessment-library/assignments/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAuthoredAssignment(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long id) {
        assignmentService.deleteAuthored(id, requireUserId(currentUser));
        return ResponseEntity.ok(ApiResponse.message("Assignment deleted successfully"));
    }

    /** Tạo một yêu cầu nghiệp vụ tổng quát. */
    @PostMapping("/requests")
    public ResponseEntity<ApiResponse<TeacherWorkspaceResponse.WorkRequest>> createRequest(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody TeacherWorkspaceRequest.WorkRequestCreate request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Request created successfully",
                teacherWorkspaceService.createWorkRequest(requireUserId(currentUser), request)));
    }

    /** Lấy lịch sử yêu cầu của chính user. */
    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<List<TeacherWorkspaceResponse.WorkRequest>>> getRequests(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Requests retrieved successfully",
                teacherWorkspaceService.getWorkRequests(requireUserId(currentUser))));
    }

    /** Tạo yêu cầu chuyển phân công lớp. */
    @PostMapping("/requests/class-transfer")
    public ResponseEntity<ApiResponse<TeacherWorkspaceResponse.WorkRequest>> createClassTransfer(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody TeacherWorkspaceRequest.ClassTransferCreate request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Class transfer request created successfully",
                teacherWorkspaceService.createClassTransfer(requireUserId(currentUser), request)));
    }

    /** Lấy đơn nghỉ của chính Teacher/TA. */
    @GetMapping("/leave-requests")
    public ResponseEntity<ApiResponse<List<TeacherWorkspaceResponse.LeaveRequestItem>>> getLeaveRequests(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Leave requests retrieved successfully",
                teacherWorkspaceService.getLeaves(requireUserId(currentUser))));
    }

    /** Tạo đơn nghỉ bằng employee ID lấy từ JWT. */
    @PostMapping("/leave-requests")
    public ResponseEntity<ApiResponse<TeacherWorkspaceResponse.LeaveRequestItem>> createLeaveRequest(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody TeacherWorkspaceRequest.LeaveCreate request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Leave request created successfully",
                teacherWorkspaceService.createLeave(requireUserId(currentUser), request)));
    }

    /** Lấy các lớp đang phụ trách. */
    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<TeacherWorkspaceResponse.ClassCard>>> getClasses(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Assigned classes retrieved successfully",
                teacherWorkspaceService.getClasses(requireUserId(currentUser))));
    }

    /** Lấy học viên và tín hiệu risk của một lớp được quản lý. */
    @GetMapping("/classes/{id}/students")
    public ResponseEntity<ApiResponse<List<TeacherWorkspaceResponse.StudentRisk>>> getClassStudents(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Class students retrieved successfully",
                teacherWorkspaceService.getClassStudents(requireUserId(currentUser), id)));
    }

    /** Gửi thông báo nhắc học tới học viên thuộc lớp đang phụ trách. */
    @PostMapping("/insights/at-risk-students/{id}/reminder")
    public ResponseEntity<ApiResponse<Void>> sendStudentReminder(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long id) {
        teacherWorkspaceService.sendStudentReminder(requireUserId(currentUser), id);
        return ResponseEntity.ok(ApiResponse.message("Student reminder sent successfully"));
    }

    /** Lấy các khoản thu nhập theo buổi dạy. */
    @GetMapping("/earnings")
    public ResponseEntity<ApiResponse<List<TeacherWorkspaceResponse.EarningItem>>> getEarnings(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Teaching earnings retrieved successfully",
                teacherWorkspaceService.getEarnings(requireUserId(currentUser))));
    }

    /** Bắt buộc principal JWT hợp lệ và trả user ID Snowflake. */
    private Long requireUserId(CustomUserDetails currentUser) {
        if (currentUser == null || currentUser.getUser() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập.");
        }
        return currentUser.getUser().getId();
    }
}
