package com.ailms.service;

import com.ailms.request.CouponRequest;
import com.ailms.response.CouponResponse;

import java.util.List;

public interface ICouponService {
    List<CouponResponse> getAll();
    CouponResponse getById(Long id);
    CouponResponse getByCode(String code);
    CouponResponse create(CouponRequest request);
    CouponResponse update(Long id, CouponRequest request);
    void delete(Long id);
    CouponResponse validateCoupon(String code, Long courseId);
}
