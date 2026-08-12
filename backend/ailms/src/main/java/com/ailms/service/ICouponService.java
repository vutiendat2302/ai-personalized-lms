package com.ailms.service;

import com.ailms.request.CouponRequest;
import com.ailms.response.CouponResponse;
import com.ailms.response.UserCouponResponse;

import java.util.List;

/**
 * Service quản lý và áp dụng các mã giảm giá (Coupon).
 */
public interface ICouponService {

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<CouponResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CouponResponse getById(Long id);

    /**
     * Lấy thông tin mã giảm giá (coupon) dựa trên mã code.
     *
     * @param code Tham số code
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CouponResponse getByCode(String code);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CouponResponse create(CouponRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CouponResponse update(Long id, CouponRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);

    /**
     * Kiểm tra tính hợp lệ của mã giảm giá đối với một khóa học cụ thể.
     *
     * @param code Tham số code
     * @param courseId ID của khóa học
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CouponResponse validateCoupon(String code, Long courseId);

    /** Cấp một coupon cho người dùng, không tạo trùng quyền sở hữu. */
    UserCouponResponse assignToUser(Long couponId, Long userId);

    /** Lấy các voucher thực sự được cấp cho người dùng. */
    List<UserCouponResponse> getUserCoupons(Long userId);

    /** Kiểm tra voucher thuộc người dùng và còn đủ điều kiện áp dụng. */
    UserCouponResponse validateUserCoupon(Long userId, String code, List<Long> courseIds);
}
