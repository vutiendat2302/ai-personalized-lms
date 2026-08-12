package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.OneOnOneRequestStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/** Lưu yêu cầu ghép người dạy 1-1 được tạo duy nhất sau thanh toán thành công. */
@Entity
@Table(name = "one_on_one_request", uniqueConstraints = {
        @UniqueConstraint(name = "uk_one_on_one_enrollment_package", columnNames = "enrollment_package_id")
}, indexes = {
        @Index(name = "idx_one_on_one_status", columnList = "status"),
        @Index(name = "idx_one_on_one_assignee", columnList = "assigned_instructor_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OneOnOneRequestEntity extends BaseEntity {

    /** Snowflake ID của yêu cầu. */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Gói ghi danh đã thanh toán tạo ra yêu cầu này. */
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "enrollment_package_id", nullable = false)
    private EnrollmentPackageEntity enrollmentPackageEntity;

    /** Học viên sở hữu yêu cầu. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private UserEntity studentEntity;

    /** Giáo viên hoặc trợ giảng đang nhận yêu cầu. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_instructor_id")
    private UserEntity assignedInstructorEntity;

    /** Lớp thử hoặc lớp chính thức được tạo cho yêu cầu. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trial_class_id")
    private ClassEntity trialClassEntity;

    /** Buổi học thử duy nhất của lần ghép hiện tại. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trial_session_id")
    private ClassOnlineEntity trialSessionEntity;

    /** Trạng thái state machine của yêu cầu. */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    @Builder.Default
    private OneOnOneRequestStatusEnum status = OneOnOneRequestStatusEnum.WAITING_INSTRUCTOR;

    @Column(name = "available_period", length = 255)
    private String availablePeriod;

    @Column(name = "available_days", length = 255)
    private String availableDays;

    @Column(name = "preferred_times", length = 500)
    private String preferredTimes;

    @Column(name = "current_level", length = 255)
    private String currentLevel;

    @Column(name = "learning_situation", columnDefinition = "TEXT")
    private String learningSituation;

    @Column(name = "learning_goals", columnDefinition = "TEXT")
    private String learningGoals;

    @Column(name = "weak_areas", columnDefinition = "TEXT")
    private String weakAreas;

    @Column(name = "instructor_preferences", columnDefinition = "TEXT")
    private String instructorPreferences;

    @Column(name = "additional_notes", columnDefinition = "TEXT")
    private String additionalNotes;

    @Column(name = "review_current_level", columnDefinition = "TEXT")
    private String reviewCurrentLevel;

    @Column(name = "review_weak_areas", columnDefinition = "TEXT")
    private String reviewWeakAreas;

    @Column(name = "review_attitude", columnDefinition = "TEXT")
    private String reviewAttitude;

    @Column(name = "review_recommended_path", columnDefinition = "TEXT")
    private String reviewRecommendedPath;

    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "contacted_at")
    private LocalDateTime contactedAt;

    @Column(name = "trial_completed_at")
    private LocalDateTime trialCompletedAt;

    /** Optimistic version bảo vệ state transition ngoài các đoạn pessimistic lock. */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
