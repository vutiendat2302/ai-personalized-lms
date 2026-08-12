package com.ailms.controller;

import com.ailms.request.CheckoutRequest;
import com.ailms.request.RefundRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.CheckoutPaymentResponse;
import com.ailms.response.OrderResponse;
import com.ailms.response.OrderStatusResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.exception.UnauthorizedException;
import com.ailms.service.IOrderService;
import com.ailms.service.IInvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

@RestController
@RequestMapping("${api.prefix}/orders")
@RequiredArgsConstructor
public class OrderController {

    private final IOrderService orderService;
    private final IInvoiceService invoiceService;

    /** Tạo checkout PayPal cho một gói sau khi xác thực người dùng hiện tại. */
    @PostMapping("/checkout")
    @PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<CheckoutPaymentResponse>> checkout(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody CheckoutRequest request) {
        Long userId = requireUserId(currentUser);
        CheckoutPaymentResponse response = orderService.checkout(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("PayPal Sandbox checkout created successfully", response));
    }

    /** Trả trạng thái đáng tin cậy sau redirect, chỉ cho chủ đơn hàng. */
    @GetMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OrderStatusResponse>> getStatus(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(
                "Order status retrieved successfully",
                orderService.getOrderStatus(requireUserId(currentUser), id)));
    }

    @PostMapping("/{id}/refund")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<OrderResponse>> refundOrder(
            @PathVariable Long id,
            @Valid @RequestBody RefundRequest request) {
        OrderResponse response = orderService.refundOrder(id, request);
        return ResponseEntity.ok(ApiResponse.of("Order refunded successfully", response));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getAllOrders() {
        List<OrderResponse> response = orderService.getAllOrders();
        return ResponseEntity.ok(ApiResponse.of("All orders retrieved successfully", response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<OrderResponse>> getById(@PathVariable Long id) {
        OrderResponse response = orderService.getOrderById(id);
        return ResponseEntity.ok(ApiResponse.of("Order retrieved successfully", response));
    }

    /** Tải hóa đơn PDF của một đơn hàng cho Admin/HR. */
    @GetMapping(value = "/{id}/invoice.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<byte[]> downloadInvoice(@PathVariable Long id) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=AILMS-invoice-" + id + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(invoiceService.downloadPaymentForManagement(id));
    }

    /** Tải chứng từ hoàn tiền đã được tự động lưu trên MinIO. */
    @GetMapping(value = "/{id}/refund-invoice.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<byte[]> downloadRefundInvoice(@PathVariable Long id) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=AILMS-refund-" + id + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(invoiceService.getRefundForManagement(id));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getByUserId(@PathVariable Long userId) {
        List<OrderResponse> response = orderService.getOrdersByUserId(userId);
        return ResponseEntity.ok(ApiResponse.of("Orders retrieved successfully", response));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @PathVariable Long id,
            @RequestParam(defaultValue = "Customer requested cancellation") String reason) {
        OrderResponse response = orderService.cancelOrder(id, reason);
        return ResponseEntity.ok(ApiResponse.of("Order cancelled successfully", response));
    }

    @PostMapping("/{id}/notes")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<String>> addNote(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String content = body.getOrDefault("content", "");
        return ResponseEntity.ok(ApiResponse.of("Internal note added successfully", content));
    }

    @PostMapping("/cleanup-expired")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<Void>> cleanupExpired() {
        orderService.cancelExpiredOrders();
        return ResponseEntity.ok(ApiResponse.message("Cleanup completed"));
    }

    /** Lấy ID người dùng đã xác thực cho các API checkout và trạng thái. */
    private Long requireUserId(CustomUserDetails currentUser) {
        if (currentUser == null || currentUser.getUser() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thanh toán.");
        }
        return currentUser.getUser().getId();
    }
}
