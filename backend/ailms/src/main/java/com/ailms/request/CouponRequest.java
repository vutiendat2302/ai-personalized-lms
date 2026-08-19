package com.ailms.request;

import com.ailms.entity.enums.CouponDiscountTypeEnum;
import com.ailms.entity.enums.CouponStatusEnum;
import com.ailms.entity.enums.CouponDistributionScopeEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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

    /** Danh sách khóa học áp dụng; rỗng nghĩa là toàn bộ khóa học. */
    private List<Long> applicableCourseIds;

    private Integer maxUsage;

    private LocalDateTime validFrom;

    private LocalDateTime validTo;

    @NotNull(message = "Status is required")
    private CouponStatusEnum status;

    /** Cách phát voucher cho học viên. */
    private CouponDistributionScopeEnum distributionScope;
}
