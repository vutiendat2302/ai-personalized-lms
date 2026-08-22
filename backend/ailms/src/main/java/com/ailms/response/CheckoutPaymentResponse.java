package com.ailms.response;

import lombok.*;

/** Trả approval URL PayPal Sandbox sau khi order và transaction PENDING đã được lưu. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutPaymentResponse {
    private Long orderId;
    private Long paymentTransactionId;
    private String payUrl;
}
