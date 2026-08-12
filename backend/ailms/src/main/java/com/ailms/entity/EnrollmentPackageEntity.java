package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import com.ailms.entity.enums.EnrollmentPackageStatusEnum;

import java.time.LocalDateTime;

/**
 * Thực thể liên kết giữa lượt ghi danh (Enrollment) và gói học (CoursePackage) đã mua thông qua đơn hàng.
 * Quản lý thời điểm kích hoạt và thời điểm hết hạn truy cập của gói học.
 */
@Entity
@Table(name = "enrollment_package", uniqueConstraints = {
        @UniqueConstraint(name = "uk_enrollment_package_order_item", columnNames = "order_item_id")
}, indexes = {
        @Index(name = "idx_enroll_pkg_enrollment_id", columnList = "enrollment_id"),
        @Index(name = "idx_enroll_pkg_course_package_id", columnList = "course_package_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EnrollmentPackageEntity extends BaseEntity {

    /** Mã định danh gói ghi danh (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Lượt ghi danh khóa học tương ứng. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private EnrollmentEntity enrollmentEntity;

    /** Gói học (Course Package) học viên đã đăng ký mua. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_package_id", nullable = false)
    private CoursePackageEntity coursePackageEntity;

    /** Chi tiết mục đơn hàng (OrderItem) mua gói học này. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItemEntity orderItemEntity;

    /** Thời điểm kích hoạt gói học cho học viên. */
    @Column(name = "activated_at")
    private LocalDateTime activatedAt;

    /** Thời điểm quyền truy cập gói học hết hạn (null nếu vô hạn). */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    /** Trạng thái quyền lợi riêng của package, độc lập với Enrollment của khóa học. */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private EnrollmentPackageStatusEnum status = EnrollmentPackageStatusEnum.ACTIVE;
}
