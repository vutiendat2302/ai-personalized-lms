package com.ailms.response;

import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.entity.enums.OrderStatusEnum;
import com.ailms.entity.enums.StudyGoalStatusEnum;
import com.ailms.entity.enums.StudyGoalTypeEnum;
import com.ailms.request.OneOnOneNeedsRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Nhóm DTO chỉ đọc phục vụ các màn hình cổng học viên. */
public final class StudentPortalItemResponse {
    /** Không cho khởi tạo lớp chứa DTO tĩnh. */
    private StudentPortalItemResponse() {}

    @Getter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CourseCard {
        private Long id; private Long enrollmentId; private String title; private String courseCode; private String courseLink;
        private String description; private String level; private String categoryName; private String coverImage;
        private DeliveryModeEnum deliveryMode;
        private Integer progressPercent; private LocalDateTime expiresAt; private boolean expired;
        private String status; private LocalDateTime lastAccessedAt;
        private Long teacherId; private String teacherName; private String teacherAvatarUrl;
        private Long reviewId; private Integer courseRating; private String courseComment;
        private Integer teacherRating; private String teacherComment;
        private Long certificateId; private String certificateCode; private String certificateStatus;
    }

    @Getter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ScheduleItem {
        private Long id; private String title; private String type; private String className; private String teacherName;
        private LocalDateTime startAt; private LocalDateTime endAt; private String roomUrl;
    }

    @Getter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AssignmentItem {
        private Long id; private String title; private Long courseId; private Long classId; private String courseName; private LocalDateTime dueDate;
        private String status; private BigDecimal score; private BigDecimal maxScore; private String feedback;
    }

    @Getter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class QuizItem {
        private Long id; private String title; private Long courseId; private Long classId; private String courseName;
        private LocalDateTime availableFrom; private LocalDateTime dueAt; private Integer timeLimitMin; private Integer maxAttempts;
        private Boolean showResultAfterSubmit; private Boolean canStart;
        private String status; private Integer attemptsUsed; private BigDecimal bestScore; private Boolean passed;
    }

    @Getter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CertificateItem {
        private Long id; private String certificateCode; private Long courseId; private String courseName;
        private LocalDateTime issuedAt; private String status; private String downloadUrl;
    }

    @Getter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProgressAnalytics {
        private List<ActivityPoint> activityLogs; private List<CoursePoint> courseProgress; private List<HeatmapPoint> contributionHeatmap;
    }

    @Getter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ActivityPoint { private LocalDate date; private BigDecimal hoursSpent; }
    @Getter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CoursePoint { private Long courseId; private String courseName; private Integer progressPercent; private BigDecimal averageQuizScore; }
    @Getter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class HeatmapPoint { private LocalDate date; private long count; }

    @Getter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class GoalItem {
        private Long id; private StudyGoalTypeEnum studyGoalTypeEnum; private Integer targetValue; private Long courseId;
        private Integer currentValue; private Integer currentStreak; private Integer longestStreak; private StudyGoalStatusEnum status;
    }

    @Getter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CartItem {
        private Long id; private Long coursePackageId; private Long courseId; private String courseTitle; private String packageName;
        private DeliveryModeEnum deliveryMode; private BigDecimal price; private Boolean requiresTutorNeeds;
        private OneOnOneNeedsRequest oneOnOneNeeds;
    }

    @Getter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class OrderItem {
        private Long id; private List<OrderLine> items; private BigDecimal totalAmount; private BigDecimal discountAmount;
        private BigDecimal finalAmount; private String couponCode; private OrderStatusEnum status;
        private String refundRequestStatus;
        private LocalDateTime createdAt; private LocalDateTime expiredAt; private boolean eligibleForRefund;
    }

    @Getter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class OrderLine { private String courseName; private String packageName; private BigDecimal price; }

    @Getter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CouponValidation {
        private boolean valid; private BigDecimal discountAmount; private String message;
    }
}
