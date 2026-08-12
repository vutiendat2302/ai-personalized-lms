package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.PaymentTransactionStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ thông tin giao dịch thanh toán qua cổng thanh toán (PayPal, VNPay, Banking...).
 */
@Entity
@Table(name = "payment_transaction", uniqueConstraints = {
        @UniqueConstraint(name = "uk_payment_momo_request_id", columnNames = "momo_request_id"),
        @UniqueConstraint(name = "uk_payment_momo_trans_id", columnNames = "momo_trans_id"),
        @UniqueConstraint(name = "uk_payment_gateway_order_id", columnNames = "gateway_order_id"),
        @UniqueConstraint(name = "uk_payment_paypal_request_id", columnNames = "paypal_request_id"),
        @UniqueConstraint(name = "uk_payment_paypal_capture_id", columnNames = "paypal_capture_id"),
        @UniqueConstraint(name = "uk_payment_paypal_refund_request_id", columnNames = "paypal_refund_request_id"),
        @UniqueConstraint(name = "uk_payment_paypal_refund_id", columnNames = "paypal_refund_id")
}, indexes = {
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

    /** Phương thức thanh toán (PAYPAL, VNPAY, MOMO, BANK_TRANSFER, CREDIT_CARD). */
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

    /** Trường legacy của migration MoMo cũ, không còn dùng trong luồng PayPal. */
    @Column(name = "momo_request_id", length = 100)
    private String momoRequestId;

    /** Order ID của cổng thanh toán, hiện lưu PayPal order ID tách khỏi Snowflake nội bộ. */
    @Column(name = "gateway_order_id", length = 100)
    private String gatewayOrderId;

    /** Trường legacy của migration MoMo cũ, không còn dùng trong luồng PayPal. */
    @Column(name = "momo_trans_id", length = 100)
    private String momoTransId;

    /** Mã capture duy nhất do PayPal trả về sau khi thanh toán hoàn tất. */
    @Column(name = "paypal_capture_id", length = 100)
    private String paypalCaptureId;

    /** Request ID idempotent gửi trong header PayPal-Request-Id. */
    @Column(name = "paypal_request_id", length = 100)
    private String paypalRequestId;

    /** Số tiền đã gửi tới PayPal theo currency gateway, tách khỏi giá gốc VND. */
    @Column(name = "gateway_amount", precision = 15, scale = 2)
    private BigDecimal gatewayAmount;

    /** Currency ISO-4217 đã gửi tới PayPal. */
    @Column(name = "gateway_currency", length = 3)
    private String gatewayCurrency;

    /** Request ID cố định giúp retry PayPal Refund mà không hoàn tiền hai lần. */
    @Column(name = "paypal_refund_request_id", length = 100)
    private String paypalRefundRequestId;

    /** ID refund duy nhất do PayPal trả về sau khi hoàn tiền thành công. */
    @Column(name = "paypal_refund_id", length = 100)
    private String paypalRefundId;

    /** Số tiền thực tế PayPal đã hoàn theo currency gateway. */
    @Column(name = "refund_amount", precision = 15, scale = 2)
    private BigDecimal refundAmount;

    /** Currency ISO-4217 của số tiền hoàn. */
    @Column(name = "refund_currency", length = 3)
    private String refundCurrency;

    /** Lý do hoàn tiền do học viên hoặc HR cung cấp. */
    @Column(name = "refund_reason", length = 255)
    private String refundReason;

    /** Thời điểm PayPal xác nhận hoàn tiền hoàn tất. */
    @Column(name = "refunded_at")
    private LocalDateTime refundedAt;

    /** Thời điểm giao dịch thanh toán được ghi nhận thành công. */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}
