package com.ailms.response;

import com.ailms.entity.enums.PaymentTransactionStatusEnum;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransactionResponse {
    private Long id;
    private Long orderId;
    private String paymentMethod;
    private BigDecimal amount;
    private PaymentTransactionStatusEnum status;
    private String transactionRef;
    private LocalDateTime paidAt;
    private String paypalRefundId;
    private BigDecimal refundAmount;
    private String refundCurrency;
    private String refundReason;
    private LocalDateTime refundedAt;
    private LocalDateTime createdAt;
}
