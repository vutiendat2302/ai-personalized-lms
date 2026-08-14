package com.ailms.client;

import com.ailms.exception.BusinessException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PaypalClientTest {

    /** Đọc approval URL từ HATEOAS payer-action của PayPal create order response. */
    @Test
    void findApprovalUrlSupportsPayerAction() {
        PaypalClient.PaypalOrderResponse.Link link = new PaypalClient.PaypalOrderResponse.Link();
        link.setRel("payer-action");
        link.setHref("https://www.sandbox.paypal.com/checkoutnow?token=ORDER");
        PaypalClient.PaypalOrderResponse response = new PaypalClient.PaypalOrderResponse();
        response.setLinks(List.of(link));

        assertEquals(link.getHref(), response.findApprovalUrl());
    }

    /** Đọc capture ID và amount từ purchase unit duy nhất sau PayPal capture. */
    @Test
    void findCaptureReadsCompletedPurchaseUnit() {
        PaypalClient.PaypalOrderResponse.Amount amount = new PaypalClient.PaypalOrderResponse.Amount();
        amount.setCurrencyCode("USD");
        amount.setValue("10.00");
        PaypalClient.PaypalOrderResponse.Capture capture = new PaypalClient.PaypalOrderResponse.Capture();
        capture.setId("CAPTURE123");
        capture.setAmount(amount);
        PaypalClient.PaypalOrderResponse.Payments payments = new PaypalClient.PaypalOrderResponse.Payments();
        payments.setCaptures(List.of(capture));
        PaypalClient.PaypalOrderResponse.PurchaseUnit unit = new PaypalClient.PaypalOrderResponse.PurchaseUnit();
        unit.setPayments(payments);
        PaypalClient.PaypalOrderResponse response = new PaypalClient.PaypalOrderResponse();
        response.setPurchaseUnits(List.of(unit));

        assertEquals("CAPTURE123", response.findCapture().getId());
    }

    /** Chỉ chấp nhận refund COMPLETED có số tiền và currency hợp lệ. */
    @Test
    void completedRefundResponseIsValidatedAndMapped() {
        PaypalClient.PaypalRefundResponse.Amount amount = new PaypalClient.PaypalRefundResponse.Amount();
        amount.setCurrencyCode("usd");
        amount.setValue("12.15");
        PaypalClient.PaypalRefundResponse response = new PaypalClient.PaypalRefundResponse();
        response.setId("REFUND123");
        response.setStatus("COMPLETED");
        response.setAmount(amount);

        PaypalClient.RefundCaptureResult result = new PaypalClient(null, null).toCompletedRefundResult(response);

        assertEquals("REFUND123", result.refundId());
        assertEquals(new BigDecimal("12.15"), result.amount());
        assertEquals("USD", result.currency());
    }

    /** Không coi PayPal refund PENDING là đã hoàn để tránh thu hồi quyền học quá sớm. */
    @Test
    void pendingRefundResponseIsRejected() {
        PaypalClient.PaypalRefundResponse response = new PaypalClient.PaypalRefundResponse();
        response.setId("REFUND123");
        response.setStatus("PENDING");

        assertThrows(BusinessException.class,
                () -> new PaypalClient(null, null).toCompletedRefundResult(response));
    }
}
