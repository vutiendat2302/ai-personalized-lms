package com.ailms.controller;

import com.ailms.request.CouponRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.CouponResponse;
import com.ailms.response.UserCouponResponse;
import com.ailms.service.ICouponService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/coupons")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
public class CouponController {

    private final ICouponService couponService;

    @PostMapping
    public ResponseEntity<ApiResponse<CouponResponse>> create(@Valid @RequestBody CouponRequest request) {
        CouponResponse response = couponService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Coupon created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CouponResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody CouponRequest request) {
        CouponResponse response = couponService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Coupon updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CouponResponse>> getById(@PathVariable Long id) {
        CouponResponse response = couponService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Coupon retrieved successfully", response));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<ApiResponse<CouponResponse>> getByCode(@PathVariable String code) {
        CouponResponse response = couponService.getByCode(code);
        return ResponseEntity.ok(ApiResponse.of("Coupon retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CouponResponse>>> getAll() {
        List<CouponResponse> response = couponService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Coupons retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        couponService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Coupon deleted successfully"));
    }

    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<CouponResponse>> validate(
            @RequestParam String code,
            @RequestParam(required = false) Long courseId) {
        CouponResponse response = couponService.validateCoupon(code, courseId);
        return ResponseEntity.ok(ApiResponse.of("Coupon is valid", response));
    }

    /** Cấp voucher cho một người dùng cụ thể để xuất hiện trong ví voucher của họ. */
    @PostMapping("/{couponId}/users/{userId}")
    public ResponseEntity<ApiResponse<UserCouponResponse>> assignToUser(
            @PathVariable Long couponId, @PathVariable Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(
                "Voucher assigned successfully", couponService.assignToUser(couponId, userId)));
    }

    /** Gửi voucher đến toàn bộ học viên đang hoạt động. */
    @PostMapping("/{couponId}/students")
    public ResponseEntity<ApiResponse<Integer>> assignToAllStudents(@PathVariable Long couponId) {
        return ResponseEntity.ok(ApiResponse.of("Voucher assigned to students successfully",
                couponService.assignToAllStudents(couponId)));
    }

    /** Gửi voucher cho nhiều học viên được chọn trong một giao dịch. */
    @PostMapping("/{couponId}/students/bulk")
    public ResponseEntity<ApiResponse<Integer>> assignToUsers(
            @PathVariable Long couponId, @RequestBody List<Long> userIds) {
        return ResponseEntity.ok(ApiResponse.of("Voucher assigned to selected students successfully",
                couponService.assignToUsers(couponId, userIds)));
    }

    /** Lấy danh sách voucher đã cấp cho một người dùng phục vụ quản lý. */
    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<List<UserCouponResponse>>> getUserCoupons(
            @PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.of(
                "User vouchers retrieved successfully", couponService.getUserCoupons(userId)));
    }
}
