package com.ailms.service;

import com.ailms.response.CartItemResponse;
import com.ailms.request.OneOnOneNeedsRequest;

import java.util.List;

/**
 * Service quản lý giỏ hàng đăng ký khóa học của học viên.
 */
public interface ICartService {

    /**
     * Thêm gói khóa học vào giỏ hàng.
     *
     * @param userId ID của người dùng (User)
     * @param coursePackageId ID của gói học phí khóa học
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CartItemResponse addToCart(Long userId, Long coursePackageId, OneOnOneNeedsRequest needs);

    /**
     * Lấy danh sách các sản phẩm hiện có trong giỏ hàng.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<CartItemResponse> getCart(Long userId);

    /**
     * Xóa một sản phẩm khỏi giỏ hàng.
     *
     * @param userId ID của người dùng (User)
     * @param cartItemId ID của sản phẩm trong giỏ hàng
     */
    void removeFromCart(Long userId, Long cartItemId);

    /**
     * Xóa toàn bộ sản phẩm trong giỏ hàng.
     *
     * @param userId ID của người dùng (User)
     */
    void clearCart(Long userId);
}
