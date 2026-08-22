package com.ailms.controller;

import com.ailms.entity.PaymentTransactionEntity;
import com.ailms.repository.PaymentTransactionRepository;
import com.ailms.mapper.PaymentTransactionMapper;
import com.ailms.response.ApiResponse;
import com.ailms.response.PaymentTransactionResponse;
import com.ailms.response.CheckoutPaymentResponse;
import com.ailms.response.OrderStatusResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IOrderService;
import com.ailms.exception.UnauthorizedException;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PaymentTransactionMapper paymentTransactionMapper;
    private final IOrderService orderService;

    /** Tạo lại approval URL PayPal cho order PENDING thuộc người dùng hiện tại. */
    @PostMapping("/paypal/create")
    @PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<CheckoutPaymentResponse>> createPaypalPayment(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestParam Long orderId) {
        if (currentUser == null || currentUser.getUser() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thanh toán.");
        }
        CheckoutPaymentResponse response = orderService.createPaypalPayment(currentUser.getUser().getId(), orderId);
        return ResponseEntity.ok(ApiResponse.of("PayPal payment created successfully", response));
    }

    /** Capture server-side order đã được PayPal phê duyệt, không tin query redirect. */
    @PostMapping("/paypal/capture")
    @PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<OrderStatusResponse>> capturePaypalPayment(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestParam Long orderId) {
        if (currentUser == null || currentUser.getUser() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để xác nhận thanh toán.");
        }
        return ResponseEntity.ok(ApiResponse.of("PayPal payment captured successfully",
                orderService.capturePaypalPayment(currentUser.getUser().getId(), orderId)));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<List<PaymentTransactionResponse>>> getAllPayments(
            @RequestParam(required = false) Long orderId) {
        List<PaymentTransactionEntity> entities = orderId == null
                ? paymentTransactionRepository.findAll()
                : paymentTransactionRepository.findByOrderEntity_Id(orderId);
        List<PaymentTransactionResponse> list = paymentTransactionMapper.toResponseList(entities);

        return ResponseEntity.ok(ApiResponse.of("Payment transactions retrieved successfully", list));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<PaymentTransactionResponse>> getPaymentById(@PathVariable Long id) {
        PaymentTransactionEntity entity = paymentTransactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment transaction not found for id: " + id));

        return ResponseEntity.ok(ApiResponse.of("Payment transaction retrieved successfully", paymentTransactionMapper.toResponse(entity)));
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<List<PaymentTransactionResponse>>> getPaymentsByOrderId(
            @PathVariable Long orderId) {
        List<PaymentTransactionResponse> list = paymentTransactionMapper.toResponseList(
                paymentTransactionRepository.findByOrderEntity_Id(orderId));
        return ResponseEntity.ok(ApiResponse.of("Order payment transactions retrieved successfully", list));
    }
}
