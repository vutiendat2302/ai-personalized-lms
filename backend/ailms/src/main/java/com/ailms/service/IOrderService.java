package com.ailms.service;

import com.ailms.request.CheckoutRequest;
import com.ailms.request.RefundRequest;
import com.ailms.response.OrderResponse;
import com.ailms.response.PaymentTransactionResponse;

import java.util.List;

public interface IOrderService {
    OrderResponse createOrder(CheckoutRequest request);
    PaymentTransactionResponse initiatePayment(Long orderId, String paymentMethod);
    OrderResponse handlePaymentCallback(String transactionRef, boolean success);
    OrderResponse refundOrder(Long orderId, RefundRequest request);
    OrderResponse getOrderById(Long orderId);
    List<OrderResponse> getOrdersByUserId(Long userId);
    void cancelExpiredOrders();
}
