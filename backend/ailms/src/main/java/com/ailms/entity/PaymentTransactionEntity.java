package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.PaymentTransactionStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ thông tin giao dịch thanh toán qua cổng thanh toán (VNPay, Momo, ZaloPay, Banking...).
 */
@Entity
@Table(name = "payment_transaction", indexes = {
        @Index(name = "idx_payment_transaction_order_id", columnList = "order_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PaymentTransactionEntity extends BaseEntity {

    /** Mã định danh giao dịch thanh toán (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Đơn hàng được thanh toán. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private OrderEntity orderEntity;

    /** Phương thức thanh toán (VNPAY, MOMO, BANK_TRANSFER, CREDIT_CARD). */
    @Column(name = "payment_method", nullable = false, length = 30)
    private String paymentMethod;

    /** Số tiền thanh toán trong giao dịch này. */
    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    /** Trạng thái giao dịch (PENDING, SUCCESS, FAILED, REFUNDED). */
    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private PaymentTransactionStatusEnum status;

    /** Mã tham chiếu giao dịch từ phía cổng thanh toán (VD: vnp_TransactionNo). */
    @Column(name = "transaction_ref", length = 100)
    private String transactionRef;

    /** Thời điểm giao dịch thanh toán được ghi nhận thành công. */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}
