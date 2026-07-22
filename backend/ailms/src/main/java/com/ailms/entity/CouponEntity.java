package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.CouponDiscountTypeEnum;
import com.ailms.entity.enums.CouponStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Lưu trữ thông tin mã giảm giá áp dụng khi thanh toán đơn hàng,
 * bao gồm giá trị giảm, điều kiện sử dụng, thời gian hiệu lực
 * và số lượt sử dụng của mã.
 */
@Entity
@Table(name = "coupon", indexes = {
        @Index(name = "idx_coupon_code", columnList = "code", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CouponEntity extends BaseEntity {

    /** Mã định danh coupon (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Mã giảm giá duy nhất do Admin phát hành (VD: SUMMER2026, WELCOME100K). */
    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    /** Loại giảm giá (PERCENTAGE = phần trăm, FIXED_AMOUNT = số tiền cố định). */
    @Column(name = "discount_type", length = 20)
    @Enumerated(EnumType.STRING)
    private CouponDiscountTypeEnum discountType;

    /** Giá trị giảm giá (phần trăm giảm VD: 10% hoặc số tiền giảm VD: 50000 VNĐ). */
    @Column(name = "discount_value", precision = 15, scale = 2)
    private BigDecimal discountValue;

    /** Khóa học cụ thể được áp dụng mã (null nếu áp dụng cho tất cả khóa học). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applicable_course_id")
    private CourseEntity applicableCourseEntity;

    /** Số lượt sử dụng tối đa của mã giảm giá (null = không giới hạn). */
    @Column(name = "max_usage")
    private Integer maxUsage;

    /** Số lượt đã sử dụng thực tế tính đến thời điểm hiện tại. */
    @Column(name = "used_count", nullable = false)
    @Builder.Default
    private Integer usedCount = 0;

    /** Thời điểm mã bắt đầu có hiệu lực. */
    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    /** Thời điểm mã hết hiệu lực sử dụng. */
    @Column(name = "valid_to")
    private LocalDateTime validTo;

    /** Trạng thái mã giảm giá (ACTIVE, INACTIVE, EXPIRED). */
    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private CouponStatusEnum status;
}
