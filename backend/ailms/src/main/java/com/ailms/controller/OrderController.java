package com.ailms.controller;

import com.ailms.request.CheckoutRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.OrderResponse;
import com.ailms.response.PaymentTransactionResponse;
import com.ailms.service.IOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/orders")
@RequiredArgsConstructor
public class OrderController {

    private final IOrderService orderService;

    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<OrderResponse>> checkout(@Valid @RequestBody CheckoutRequest request) {
        OrderResponse response = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Order placed successfully", response));
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<ApiResponse<PaymentTransactionResponse>> pay(
            @PathVariable Long id,
            @RequestParam String paymentMethod) {
        PaymentTransactionResponse response = orderService.initiatePayment(id, paymentMethod);
        return ResponseEntity.ok(ApiResponse.of("Payment transaction initiated", response));
    }

    @PostMapping("/payment-callback")
    public ResponseEntity<ApiResponse<OrderResponse>> paymentCallback(
            @RequestParam String transactionRef,
            @RequestParam boolean success) {
        OrderResponse response = orderService.handlePaymentCallback(transactionRef, success);
        return ResponseEntity.ok(ApiResponse.of("Payment callback processed successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getById(@PathVariable Long id) {
        OrderResponse response = orderService.getOrderById(id);
        return ResponseEntity.ok(ApiResponse.of("Order retrieved successfully", response));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getByUserId(@PathVariable Long userId) {
        List<OrderResponse> response = orderService.getOrdersByUserId(userId);
        return ResponseEntity.ok(ApiResponse.of("Orders retrieved successfully", response));
    }

    @PostMapping("/cleanup-expired")
    public ResponseEntity<ApiResponse<Void>> cleanupExpired() {
        orderService.cancelExpiredOrders();
        return ResponseEntity.ok(ApiResponse.message("Cleanup completed"));
    }
}
