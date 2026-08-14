package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Nhóm DTO trả về dành riêng cho workspace của giáo viên và trợ giảng. */
public final class TeacherWorkspaceResponse {

    /** Không cho khởi tạo class chỉ dùng làm namespace DTO. */
    private TeacherWorkspaceResponse() {
    }

    /** Các chỉ số tổng hợp trên dashboard của người dạy hiện tại. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Metrics {
        private long activeClassesCount;
        private long sessionsThisWeekCompleted;
        private long sessionsThisWeekTotal;
        private long unreviewedSessionsCount;
        private long unreviewedMinSecondsLeft;
        private long pendingGradingAssignmentsCount;
        private long pendingFillBlankQuizzesCount;
        private long newSuggestedClassesCount;
        private long atRiskStudentsCount;
        private Double averageRating;
        private BigDecimal estimatedEarningsMonth;
        private boolean hasAssignedCategory;
    }

    /** Một buổi dạy trên agenda dashboard. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AgendaSession {
        private String id;
        private String className;
        private String courseName;
        private String sessionTime;
        private int studentCount;
        private String roomUrl;
        private String status;
        private Long secondsLeftToReview;
    }

    /** Một buổi học online trên lịch tuần/tháng. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class OnlineSession {
        private String id;
        private String classId;
        private String className;
        private String courseName;
        private String title;
        private String startTime;
        private String endTime;
        private Double startHour;
        private Double endHour;
        private String dateStr;
        private int dayOfWeek;
        private String roomUrl;
        private String status;
        private Long secondsLeftToReview;
        private String reviewNote;
    }

    /** Thông tin bài nộp đang chờ giáo viên chấm. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SubmissionQueueItem {
        private String id;
        private String studentName;
        private String studentEmail;
        private String assignmentTitle;
        private String className;
        private LocalDateTime submittedAt;
        private boolean isLate;
        private String content;
        private String attachmentUrl;
        private BigDecimal maxScore;
    }

    /** Một câu tự luận/điền từ cần chấm tay. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class FillBlankQueueItem {
        private String id;
        private String attemptId;
        private String quizTitle;
        private String studentName;
        private String questionText;
        private String studentAnswer;
        private String correctAnswer;
        private BigDecimal maxPoints;
        private BigDecimal pointsEarned;
    }

    /** Thống kê tỷ lệ sai của một câu hỏi. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class QuestionDifficulty {
        private String id;
        private String quizTitle;
        private String questionText;
        private long totalAttempts;
        private long errorCount;
        private double errorRatePercent;
    }

    /** Assessment do chính giáo viên/trợ giảng hiện tại tạo. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AuthoredAssessment {
        private String id;
        private String type;
        private String title;
        private Long courseId;
        private Long classId;
        private String status;
        private LocalDateTime dueAt;
        private BigDecimal maxScore;
        private Integer attemptsCount;
        private LocalDateTime createdAt;
    }

    /** Yêu cầu nghiệp vụ do giáo viên/trợ giảng tạo. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class WorkRequest {
        private String id;
        private String type;
        private Long targetId;
        private String reason;
        private String status;
        private String decisionComment;
        private LocalDateTime createdAt;
        private LocalDateTime decidedAt;
    }

    /** Đơn nghỉ phép của chính người dạy. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LeaveRequestItem {
        private String id;
        private String leaveType;
        private LocalDate startDate;
        private LocalDate endDate;
        private String reason;
        private String status;
        private String rejectionReason;
        private LocalDateTime createdAt;
    }

    /** Thẻ lớp mà giáo viên/trợ giảng đang phụ trách. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ClassCard {
        private String id;
        private String className;
        private String courseName;
        private String deliveryMode;
        private String roleInClass;
        private int currentStudents;
        private int maxStudents;
        private String scheduleSummary;
        private int avgProgressPercent;
        private String status;
    }

    /** Học viên và tín hiệu rủi ro trong một lớp. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StudentRisk {
        private String id;
        private String studentId;
        private String studentName;
        private String studentEmail;
        private String studentAvatar;
        private int daysInactive;
        private int progressPercent;
        private int expectedPercent;
        private BigDecimal avgQuizScore;
        private LocalDateTime lastAccessedAt;
        private boolean isAtRisk;
        private String riskReason;
    }

    /** Bản ghi thu nhập của một buổi dạy. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class EarningItem {
        private String id;
        private String sessionId;
        private String className;
        private LocalDate date;
        private double durationHours;
        private BigDecimal hourlyRate;
        private BigDecimal totalAmount;
        private String status;
    }
}
