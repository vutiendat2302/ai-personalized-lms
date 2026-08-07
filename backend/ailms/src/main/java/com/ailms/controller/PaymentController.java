package com.ailms.controller;

import com.ailms.entity.PaymentTransactionEntity;
import com.ailms.repository.PaymentTransactionRepository;
import com.ailms.mapper.PaymentTransactionMapper;
import com.ailms.response.ApiResponse;
import com.ailms.response.PaymentTransactionResponse;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PaymentTransactionMapper paymentTransactionMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PaymentTransactionResponse>>> getAllPayments(
            @RequestParam(required = false) Long orderId) {
        List<PaymentTransactionEntity> entities = orderId == null
                ? paymentTransactionRepository.findAll()
                : paymentTransactionRepository.findByOrderEntity_Id(orderId);
        List<PaymentTransactionResponse> list = paymentTransactionMapper.toResponseList(entities);

        return ResponseEntity.ok(ApiResponse.of("Payment transactions retrieved successfully", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PaymentTransactionResponse>> getPaymentById(@PathVariable Long id) {
        PaymentTransactionEntity entity = paymentTransactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment transaction not found for id: " + id));

        return ResponseEntity.ok(ApiResponse.of("Payment transaction retrieved successfully", paymentTransactionMapper.toResponse(entity)));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<List<PaymentTransactionResponse>>> getPaymentsByOrderId(
            @PathVariable Long orderId) {
        List<PaymentTransactionResponse> list = paymentTransactionMapper.toResponseList(
                paymentTransactionRepository.findByOrderEntity_Id(orderId));
        return ResponseEntity.ok(ApiResponse.of("Order payment transactions retrieved successfully", list));
    }
}
