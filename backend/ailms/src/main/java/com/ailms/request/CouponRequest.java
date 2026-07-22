package com.ailms.request;

import com.ailms.entity.enums.CouponDiscountTypeEnum;
import com.ailms.entity.enums.CouponStatusEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponRequest {

    @NotBlank(message = "Coupon code is required")
    private String code;

    @NotNull(message = "Discount type is required")
    private CouponDiscountTypeEnum discountType;

    @NotNull(message = "Discount value is required")
    private BigDecimal discountValue;

    private Long applicableCourseId;

    private Integer maxUsage;

    private LocalDateTime validFrom;

    private LocalDateTime validTo;

    @NotNull(message = "Status is required")
    private CouponStatusEnum status;
}
