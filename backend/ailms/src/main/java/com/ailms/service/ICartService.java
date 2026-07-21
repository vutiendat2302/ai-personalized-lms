package com.ailms.service;

import com.ailms.response.CartItemResponse;

import java.util.List;

public interface ICartService {

    CartItemResponse addToCart(Long userId, Long coursePackageId);

    List<CartItemResponse> getCart(Long userId);

    void removeFromCart(Long userId, Long cartItemId);

    void clearCart(Long userId);
}
