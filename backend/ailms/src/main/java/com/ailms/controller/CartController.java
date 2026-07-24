package com.ailms.controller;

import com.ailms.response.ApiResponse;
import com.ailms.response.CartItemResponse;
import com.ailms.service.ICartService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/cart")
@RequiredArgsConstructor
public class CartController {

    private final ICartService cartService;

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CartItemResponse>> addToCart(
            @RequestParam Long userId,
            @RequestParam Long coursePackageId) {
        CartItemResponse response = cartService.addToCart(userId, coursePackageId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Item added to cart successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CartItemResponse>>> getCart(@RequestParam Long userId) {
        List<CartItemResponse> response = cartService.getCart(userId);
        return ResponseEntity.ok(ApiResponse.of("Cart items retrieved successfully", response));
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<ApiResponse<Void>> removeFromCart(
            @RequestParam Long userId,
            @PathVariable Long id) {
        cartService.removeFromCart(userId, id);
        return ResponseEntity.ok(ApiResponse.message("Item removed from cart successfully"));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<ApiResponse<Void>> clearCart(@RequestParam Long userId) {
        cartService.clearCart(userId);
        return ResponseEntity.ok(ApiResponse.message("Cart cleared successfully"));
    }
}
