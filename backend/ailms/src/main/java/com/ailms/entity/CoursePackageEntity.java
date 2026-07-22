package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

/**
 * Lưu trữ thông tin các gói học (Course Package) được mở bán cho khóa học,
 * bao gồm hình thức học, giá bán, thời hạn sử dụng và các quyền lợi đi kèm.
 */
@Entity
@Table(name = "course_package", indexes = {
        @Index(name = "idx_course_package_course_id", columnList = "course_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CoursePackageEntity extends BaseEntity {

    /** Mã định danh gói học (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Khóa học tương ứng được đóng gói mở bán. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private CourseEntity courseEntity;

    /** Lớp học mở kèm theo gói học (nếu đăng ký lớp ghép/lớp 1-1). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private ClassEntity classEntity;

    /** Tên hiển thị của gói học (VD: Gói Tự học, Gói Pro 1-1, Gói Lớp nhóm). */
    @Column(name = "name",  length = 100)
    private String name;

    /** Mô tả chi tiết quyền lợi và đặc điểm của gói học. */
    @Column(name = "description")
    private String description;

    /** Hình thức học (SELF_PACED, LIVE_CLASS, HYBRID, ONE_ON_ONE). */
    @Column(name = "delivery_mode", length = 30)
    @Enumerated(EnumType.STRING)
    private DeliveryModeEnum deliveryMode;

    /** Giá bán khuyến mãi / thực tế hiện tại của gói học. */
    @Column(name = "price", precision = 15, scale = 2)
    private BigDecimal price;

    /** Giá gốc niêm yết của gói học. */
    @Column(name = "original_price", precision = 15, scale = 2)
    private BigDecimal originalPrice;

    /** Thời hạn sử dụng/truy cập khóa học tính theo số ngày (VD: 30, 90, 365 ngày). */
    @Column(name = "duration_days")
    private Integer durationDays;

    /** Số buổi học trực tuyến kèm riêng với giảng viên được bao gồm trong gói. */
    @Column(name = "included_tutor_sessions")
    private Integer includedTutorSessions;

    /** Số lượng học viên tối đa trong một lớp học nhóm thuộc gói này. */
    @Column(name = "max_group_size")
    private Integer maxGroupSize;

    /** Trạng thái gói học (ACTIVE, INACTIVE, OUT_OF_STOCK). */
    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CoursePackageStatusEnum status = CoursePackageStatusEnum.ACTIVE;
}
