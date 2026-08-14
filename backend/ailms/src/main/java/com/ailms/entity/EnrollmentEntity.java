package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Thực thể ghi danh / đăng ký khóa học của học viên.
 * Quản lý thông tin khóa học, lớp học đăng ký, trạng thái và mốc thời gian hoàn thành.
 */
@Entity
@Table(name = "enrollment", uniqueConstraints = {
        @UniqueConstraint(name = "uk_enrollment_user_course", columnNames = {"user_id", "course_id"})
}, indexes = {
        @Index(name = "idx_enrollment_user_id", columnList = "user_id"),
        @Index(name = "idx_enrollment_course_id", columnList = "course_id"),
        @Index(name = "idx_enrollment_class_id", columnList = "class_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EnrollmentEntity extends BaseEntity {

    /** Mã định danh lượt ghi danh (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Học viên tham gia ghi danh. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    /** Khóa học được đăng ký ghi danh. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private CourseEntity courseEntity;

    /** Lớp học cụ thể học viên tham gia (nếu đăng ký theo lớp). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private ClassEntity classEntity;

    /** Trạng thái ghi danh (0 = IN_PROGRESS, 1 = COMPLETED, 2 = EXPIRED, 3 = CANCELLED). */
    @Column(name = "status")
    private Byte status;

    /** Thời điểm học viên hoàn tất ghi danh chính thức. */
    @Column(name = "enrolled_at")
    private LocalDateTime enrolledAt;

    /** Thời điểm học viên hoàn thành xong toàn bộ khóa học. */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
