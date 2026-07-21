package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.OrderStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Thực thể lưu trữ thông tin đơn hàng mua gói học / khóa học của học viên.
 * Quản lý tổng tiền, giảm giá từ coupon, trạng thái thanh toán và danh sách mục đơn hàng.
 */
@Entity
@Table(name = "`order`", indexes = {
        @Index(name = "idx_order_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OrderEntity extends BaseEntity {

    /** Mã định danh đơn hàng (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Học viên thực hiện đặt mua đơn hàng. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    /** Trạng thái đơn hàng (PENDING, PAID, CANCELLED, REFUNDED, EXPIRED). */
    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private OrderStatusEnum status;

    /** Tổng giá trị gốc tiền hàng (chưa trừ mã giảm giá). */
    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    /** Số tiền được giảm giá (từ coupon / mã khuyến mãi). */
    @Column(name = "discount_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal discountAmount;

    /** Tổng số tiền thực tế học viên phải thanh toán (finalAmount = totalAmount - discountAmount). */
    @Column(name = "final_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal finalAmount;

    /** Mã coupon giảm giá đã áp dụng cho đơn hàng (nếu có). */
    @Column(name = "coupon_code", length = 50)
    private String couponCode;

    /** Thời điểm đơn hàng hết hạn chờ thanh toán. */
    @Column(name = "expired_at")
    private LocalDateTime expiredAt;

    /** Thời điểm đơn hàng được thanh toán thành công. */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    /** Danh sách các sản phẩm / gói học nằm trong đơn hàng. */
    @OneToMany(mappedBy = "orderEntity", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<OrderItemEntity> items = new ArrayList<>();
}
