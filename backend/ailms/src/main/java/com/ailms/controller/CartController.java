package com.ailms.controller;

import com.ailms.response.ApiResponse;
import com.ailms.response.CartItemResponse;
import com.ailms.service.ICartService;
import com.ailms.request.StudentCartAddRequest;
import com.ailms.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/cart")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_STUDENT')")
public class CartController {

    private final ICartService cartService;

    /** Thêm gói học vào giỏ của người dùng JWT, không nhận userId từ client. */
    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CartItemResponse>> addToCart(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody StudentCartAddRequest request) {
        CartItemResponse response = cartService.addToCart(
                currentUser.getUser().getId(), request.getCoursePackageId(), request.getOneOnOneNeeds());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Item added to cart successfully", response));
    }

    /** Lấy giỏ hàng của chính người dùng JWT. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<CartItemResponse>>> getCart(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        List<CartItemResponse> response = cartService.getCart(currentUser.getUser().getId());
        return ResponseEntity.ok(ApiResponse.of("Cart items retrieved successfully", response));
    }

    /** Xóa một dòng giỏ hàng thuộc chính người dùng JWT. */
    @DeleteMapping("/items/{id}")
    public ResponseEntity<ApiResponse<Void>> removeFromCart(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long id) {
        cartService.removeFromCart(currentUser.getUser().getId(), id);
        return ResponseEntity.ok(ApiResponse.message("Item removed from cart successfully"));
    }

    /** Xóa toàn bộ giỏ hàng của chính người dùng JWT. */
    @DeleteMapping("/clear")
    public ResponseEntity<ApiResponse<Void>> clearCart(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        cartService.clearCart(currentUser.getUser().getId());
        return ResponseEntity.ok(ApiResponse.message("Cart cleared successfully"));
    }
}
