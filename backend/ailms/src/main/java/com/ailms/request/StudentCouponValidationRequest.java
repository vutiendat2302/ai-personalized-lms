package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/** Yêu cầu kiểm tra coupon từ giỏ hàng học viên. */
@Getter
@Setter
public class StudentCouponValidationRequest {
    @NotBlank(message = "Coupon code is required")
    private String code;
    private Long courseId;
}
