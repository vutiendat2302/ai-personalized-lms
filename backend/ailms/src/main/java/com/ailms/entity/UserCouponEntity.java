package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.UserCouponStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/** Lưu một voucher đã được cấp cho học viên và vòng đời sử dụng của voucher đó. */
@Entity
@Table(name = "user_coupon", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_coupon_user_coupon", columnNames = {"user_id", "coupon_id"})
}, indexes = {
        @Index(name = "idx_user_coupon_user_status", columnList = "user_id,status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserCouponEntity extends BaseEntity {

    /** Snowflake ID của quyền voucher. */
    @Id
    @SnowflakeId
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    /** Học viên được quyền sử dụng voucher. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    /** Coupon gốc do quản trị viên phát hành. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "coupon_id", nullable = false)
    private CouponEntity couponEntity;

    /** Trạng thái quyền voucher của học viên. */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private UserCouponStatusEnum status = UserCouponStatusEnum.AVAILABLE;

    /** Order đang giữ voucher trong thời gian chờ thanh toán. */
    @Column(name = "reserved_order_id")
    private Long reservedOrderId;

    /** Order gần nhất đã dùng voucher thành công. */
    @Column(name = "used_order_id")
    private Long usedOrderId;

    /** Thời điểm voucher được giữ cho checkout. */
    @Column(name = "reserved_at")
    private LocalDateTime reservedAt;

    /** Thời điểm thanh toán sử dụng voucher thành công. */
    @Column(name = "used_at")
    private LocalDateTime usedAt;
}
