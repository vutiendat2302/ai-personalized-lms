package com.ailms.response;

import com.ailms.entity.enums.OrderStatusEnum;
import com.ailms.entity.enums.PaymentTransactionStatusEnum;
import lombok.*;

/** Trạng thái tin cậy của đơn hàng và giao dịch dùng ở trang redirect chờ kết quả. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderStatusResponse {
    private Long orderId;
    private OrderStatusEnum orderStatus;
    private Long paymentTransactionId;
    private PaymentTransactionStatusEnum paymentStatus;
}
