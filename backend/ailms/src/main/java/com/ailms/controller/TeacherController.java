package com.ailms.controller;

import com.ailms.response.ApiResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("${api.prefix}/v1/teacher")
@RequiredArgsConstructor
public class TeacherController {

    // --- DTO DEFINITIONS ---

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeacherDashboardMetricsResponse {
        private Integer unreviewedSessionsCount;
        private Integer unreviewedMinSecondsLeft;
        private Integer pendingGradingAssignmentsCount;
        private Integer pendingFillBlankQuizzesCount;
        private Integer newSuggestedClassesCount;
        private Integer atRiskStudentsCount;
        private Integer activeClassesCount;
        private Integer sessionsThisWeekCompleted;
        private Integer sessionsThisWeekTotal;
        private Double averageRating;
        private Double estimatedEarningsMonth;
        private Boolean hasAssignedCategory;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgendaSessionResponse {
        private String id;
        private String className;
        private String courseName;
        private String sessionTime;
        private Integer studentCount;
        private String roomUrl;
        private String status; // SCHEDULED, UNREVIEWED, REVIEWED
        private Integer secondsLeftToReview;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeacherClassCardResponse {
        private String id;
        private String className;
        private String courseName;
        private String deliveryMode; // GROUP_CLASS, ONE_ON_ONE
        private String roleInClass; // TEACHER, TA
        private Integer currentStudents;
        private Integer maxStudents;
        private String scheduleSummary;
        private Integer avgProgressPercent;
        private String status; // ACTIVE, COMPLETED
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentRiskResponse {
        private String id;
        private String studentName;
        private String studentEmail;
        private String studentAvatar;
        private String courseName;
        private String className;
        private Integer daysInactive;
        private Integer progressPercent;
        private Integer expectedPercent;
        private Double avgQuizScore;
        private String riskReason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OnlineSessionResponse {
        private String id;
        private String classId;
        private String className;
        private String courseName;
        private String title;
        private String startTime;
        private String endTime;
        private Integer startHour;
        private Double endHour;
        private String dateStr;
        private Integer dayOfWeek; // 0: Mon, 1: Tue, ..., 6: Sun
        private String roomUrl;
        private String status; // SCHEDULED, UNREVIEWED, REVIEWED
        private Integer secondsLeftToReview;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeachingSessionPaymentResponse {
        private String id;
        private String className;
        private String date;
        private Double durationHours;
        private Double hourlyRate;
        private Double totalAmount;
        private String status; // DRAFT, PENDING, CONFIRMED, PAID
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveRequestResponse {
        private String id;
        private String startDate;
        private String endDate;
        private String reason;
        private String status; // PENDING, APPROVED, REJECTED
        private String createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmissionQueueResponse {
        private String id;
        private String studentName;
        private String studentEmail;
        private String assignmentTitle;
        private String className;
        private String submittedAt;
        private Boolean isLate;
        private String content;
        private String attachmentUrl;
        private Double maxScore;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FillBlankQueueResponse {
        private String id;
        private String attemptId;
        private String quizTitle;
        private String studentName;
        private String questionText;
        private String studentAnswer;
        private String correctAnswer;
        private Double maxPoints;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionDifficultyResponse {
        private String id;
        private String quizTitle;
        private String questionText;
        private Integer totalAttempts;
        private Integer errorCount;
        private Double errorRatePercent;
    }

    // --- REST ENDPOINTS ---

    @GetMapping("/categories/prerequisite")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkPrerequisiteCategory() {
        return ResponseEntity.ok(ApiResponse.of("Check teacher category assignment", Map.of("hasAssignedCategory", true)));
    }

    @GetMapping("/dashboard/metrics")
    public ResponseEntity<ApiResponse<TeacherDashboardMetricsResponse>> getDashboardMetrics() {
        TeacherDashboardMetricsResponse metrics = TeacherDashboardMetricsResponse.builder()
                .unreviewedSessionsCount(1)
                .unreviewedMinSecondsLeft(18 * 3600 + 15 * 60)
                .pendingGradingAssignmentsCount(5)
                .pendingFillBlankQuizzesCount(3)
                .newSuggestedClassesCount(4)
                .atRiskStudentsCount(3)
                .activeClassesCount(4)
                .sessionsThisWeekCompleted(8)
                .sessionsThisWeekTotal(12)
                .averageRating(4.9)
                .estimatedEarningsMonth(18500000.0)
                .hasAssignedCategory(true)
                .build();
        return ResponseEntity.ok(ApiResponse.of("Dashboard metrics retrieved successfully", metrics));
    }

    @GetMapping("/dashboard/agenda")
    public ResponseEntity<ApiResponse<List<AgendaSessionResponse>>> getAgenda() {
        List<AgendaSessionResponse> agenda = List.of(
                AgendaSessionResponse.builder()
                        .id("sess-101")
                        .className("Lớp Fullstack Web FS-2026-K1")
                        .courseName("Fullstack Web Pro 1-1")
                        .sessionTime("19:00 - 21:00 (Hôm nay)")
                        .studentCount(1)
                        .roomUrl("https://meet.jit.si/ailms-fs2026")
                        .status("SCHEDULED")
                        .build(),
                AgendaSessionResponse.builder()
                        .id("sess-103")
                        .className("Lớp React-Advanced-K9")
                        .courseName("Frontend React & Next.js")
                        .sessionTime("19:00 - 21:00 (Hôm qua)")
                        .studentCount(18)
                        .roomUrl("https://meet.jit.si/ailms-react9")
                        .status("UNREVIEWED")
                        .secondsLeftToReview(18 * 3600 + 15 * 60)
                        .build()
        );
        return ResponseEntity.ok(ApiResponse.of("Agenda retrieved successfully", agenda));
    }

    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<TeacherClassCardResponse>>> getClasses() {
        List<TeacherClassCardResponse> classes = List.of(
                TeacherClassCardResponse.builder()
                        .id("cls-1")
                        .className("Lớp Fullstack Web FS-2026-K1")
                        .courseName("Fullstack Web Pro với Next.js & Spring Boot")
                        .deliveryMode("ONE_ON_ONE")
                        .roleInClass("TEACHER")
                        .currentStudents(1)
                        .maxStudents(1)
                        .scheduleSummary("T2-T4-T6 (19:00 - 21:00)")
                        .avgProgressPercent(68)
                        .status("ACTIVE")
                        .build(),
                TeacherClassCardResponse.builder()
                        .id("cls-2")
                        .className("Lớp AI Specialist K2")
                        .courseName("AI Application Specialist & LangChain")
                        .deliveryMode("GROUP_CLASS")
                        .roleInClass("TEACHER")
                        .currentStudents(15)
                        .maxStudents(20)
                        .scheduleSummary("T3-T5 (20:00 - 21:30)")
                        .avgProgressPercent(42)
                        .status("ACTIVE")
                        .build(),
                TeacherClassCardResponse.builder()
                        .id("cls-3")
                        .className("Lớp Frontend React Advanced K9")
                        .courseName("Frontend React & Next.js Pro")
                        .deliveryMode("GROUP_CLASS")
                        .roleInClass("TA")
                        .currentStudents(18)
                        .maxStudents(25)
                        .scheduleSummary("T7-CN (19:00 - 21:00)")
                        .avgProgressPercent(85)
                        .status("ACTIVE")
                        .build()
        );
        return ResponseEntity.ok(ApiResponse.of("Assigned classes retrieved successfully", classes));
    }

    @GetMapping("/classes/{id}/students")
    public ResponseEntity<ApiResponse<List<StudentRiskResponse>>> getClassStudents(@PathVariable String id) {
        List<StudentRiskResponse> students = List.of(
                StudentRiskResponse.builder()
                        .id("std-101")
                        .studentName("Trần Bảo Nam")
                        .studentEmail("nam.tran@example.com")
                        .courseName("Fullstack Web Pro")
                        .className("Lớp FS-2026-K1")
                        .daysInactive(9)
                        .progressPercent(25)
                        .expectedPercent(65)
                        .avgQuizScore(4.5)
                        .riskReason("Chưa đăng nhập 9 ngày & Tiến độ chậm 40% so với kế hoạch")
                        .build(),
                StudentRiskResponse.builder()
                        .id("std-102")
                        .studentName("Nguyễn Phương Thảo")
                        .studentEmail("thao.nguyen@example.com")
                        .courseName("AI Specialist")
                        .className("Lớp AI-K2")
                        .daysInactive(8)
                        .progressPercent(30)
                        .expectedPercent(70)
                        .avgQuizScore(5.0)
                        .riskReason("Điểm Quiz thấp & Trễ 2 bài tập về nhà")
                        .build()
        );
        return ResponseEntity.ok(ApiResponse.of("Class students retrieved successfully", students));
    }

    @GetMapping("/sessions/online")
    public ResponseEntity<ApiResponse<List<OnlineSessionResponse>>> getOnlineSessions() {
        List<OnlineSessionResponse> sessions = List.of(
                OnlineSessionResponse.builder()
                        .id("sess-101")
                        .classId("cls-1")
                        .className("Lớp Fullstack Web FS-2026-K1")
                        .courseName("Fullstack Web Pro 1-1")
                        .title("Buổi 12: Thực hành JWT Filter Spring Security")
                        .startTime("19:00")
                        .endTime("21:00")
                        .startHour(19)
                        .endHour(21.0)
                        .dateStr("2026-08-03")
                        .dayOfWeek(0)
                        .roomUrl("https://meet.jit.si/ailms-fs2026")
                        .status("SCHEDULED")
                        .build(),
                OnlineSessionResponse.builder()
                        .id("sess-103")
                        .classId("cls-3")
                        .className("Lớp React-Advanced-K9")
                        .courseName("Frontend React & Next.js")
                        .title("Buổi 8: Server Actions & React Server Components")
                        .startTime("19:00")
                        .endTime("21:00")
                        .startHour(19)
                        .endHour(21.0)
                        .dateStr("2026-08-02")
                        .dayOfWeek(6)
                        .roomUrl("https://meet.jit.si/ailms-react9")
                        .status("UNREVIEWED")
                        .secondsLeftToReview(18 * 3600 + 15 * 60)
                        .build()
        );
        return ResponseEntity.ok(ApiResponse.of("Online sessions retrieved successfully", sessions));
    }

    @PostMapping("/sessions/{id}/review")
    public ResponseEntity<ApiResponse<Boolean>> submitSessionReview(
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.of("Session review submitted successfully and payment triggered", true));
    }

    @GetMapping("/grading/assignments")
    public ResponseEntity<ApiResponse<List<SubmissionQueueResponse>>> getGradingAssignments() {
        List<SubmissionQueueResponse> queue = List.of(
                SubmissionQueueResponse.builder()
                        .id("sub-201")
                        .studentName("Trần Bảo Nam")
                        .studentEmail("nam.tran@example.com")
                        .assignmentTitle("Bài tập 2: JWT Filter Spring Security")
                        .className("Lớp FS-2026-K1")
                        .submittedAt("2026-08-02 23:15")
                        .isLate(true)
                        .content("Em đã hoàn thành cấu hình OncePerRequestFilter và mã hóa mật khẩu bằng BCryptPasswordEncoder. Link github: https://github.com/namtran/jwt-demo")
                        .maxScore(10.0)
                        .build()
        );
        return ResponseEntity.ok(ApiResponse.of("Assignment grading queue retrieved successfully", queue));
    }

    @PostMapping("/submissions/{id}/grade")
    public ResponseEntity<ApiResponse<Boolean>> gradeSubmission(
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.of("Submission graded successfully", true));
    }

    @GetMapping("/grading/quizzes/fill-blank")
    public ResponseEntity<ApiResponse<List<FillBlankQueueResponse>>> getFillBlankQuizzes() {
        List<FillBlankQueueResponse> items = List.of(
                FillBlankQueueResponse.builder()
                        .id("fb-301")
                        .attemptId("att-99")
                        .quizTitle("Quiz 1: Tổng quan Spring Security & Authorization")
                        .studentName("Trần Bảo Nam")
                        .questionText("Điền tên Interface duy nhất của Spring Security dùng để load thông tin người dùng từ DB?")
                        .studentAnswer("UserDetailsService")
                        .correctAnswer("UserDetailsService")
                        .maxPoints(2.0)
                        .build()
        );
        return ResponseEntity.ok(ApiResponse.of("Fill blank quizzes queue retrieved successfully", items));
    }

    @PostMapping("/grading/quizzes/fill-blank/{id}")
    public ResponseEntity<ApiResponse<Boolean>> gradeFillBlankQuestion(
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.of("Fill blank question graded successfully", true));
    }

    @GetMapping("/grading/quizzes/difficulty-stats")
    public ResponseEntity<ApiResponse<List<QuestionDifficultyResponse>>> getQuestionDifficultyStats() {
        List<QuestionDifficultyResponse> stats = List.of(
                QuestionDifficultyResponse.builder()
                        .id("qd-1")
                        .quizTitle("Quiz 2: JWT Authentication & Filter Order")
                        .questionText("Thứ tự chính xác của SecurityContextPersistenceFilter và UsernamePasswordAuthenticationFilter?")
                        .totalAttempts(45)
                        .errorCount(28)
                        .errorRatePercent(62.2)
                        .build()
        );
        return ResponseEntity.ok(ApiResponse.of("Question difficulty stats retrieved successfully", stats));
    }

    @GetMapping("/earnings")
    public ResponseEntity<ApiResponse<List<TeachingSessionPaymentResponse>>> getEarnings() {
        List<TeachingSessionPaymentResponse> payments = List.of(
                TeachingSessionPaymentResponse.builder()
                        .id("pay-1")
                        .className("Lớp React-Advanced-K9")
                        .date("02/08/2026")
                        .durationHours(2.0)
                        .hourlyRate(250000.0)
                        .totalAmount(500000.0)
                        .status("DRAFT")
                        .build(),
                TeachingSessionPaymentResponse.builder()
                        .id("pay-2")
                        .className("Lớp Fullstack Web FS-2026-K1")
                        .date("31/07/2026")
                        .durationHours(2.0)
                        .hourlyRate(300000.0)
                        .totalAmount(600000.0)
                        .status("CONFIRMED")
                        .build(),
                TeachingSessionPaymentResponse.builder()
                        .id("pay-3")
                        .className("Lớp AI Specialist K2")
                        .date("28/07/2026")
                        .durationHours(1.5)
                        .hourlyRate(350000.0)
                        .totalAmount(525000.0)
                        .status("PAID")
                        .build()
        );
        return ResponseEntity.ok(ApiResponse.of("Teaching session payments retrieved successfully", payments));
    }

    @GetMapping("/leave-requests")
    public ResponseEntity<ApiResponse<List<LeaveRequestResponse>>> getLeaveRequests() {
        List<LeaveRequestResponse> requests = List.of(
                LeaveRequestResponse.builder()
                        .id("lr-1")
                        .startDate("2026-08-10")
                        .endDate("2026-08-12")
                        .reason("Tham gia hội thảo Công nghệ AI & Spring Cloud tại Đà Nẵng")
                        .status("APPROVED")
                        .createdAt("2026-08-01T09:00:00Z")
                        .build()
        );
        return ResponseEntity.ok(ApiResponse.of("Leave requests retrieved successfully", requests));
    }

    @PostMapping("/leave-requests")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> createLeaveRequest(@RequestBody Map<String, String> body) {
        LeaveRequestResponse created = LeaveRequestResponse.builder()
                .id("lr-" + System.currentTimeMillis())
                .startDate(body.getOrDefault("startDate", "2026-08-15"))
                .endDate(body.getOrDefault("endDate", "2026-08-16"))
                .reason(body.getOrDefault("reason", "Báo bận cá nhân"))
                .status("PENDING")
                .createdAt(LocalDateTime.now().toString())
                .build();
        return ResponseEntity.ok(ApiResponse.of("Leave request created successfully", created));
    }

    @PostMapping("/insights/at-risk-students/{id}/reminder")
    public ResponseEntity<ApiResponse<Boolean>> sendStudentReminder(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.of("Reminder notification and email sent to student successfully", true));
    }
}
