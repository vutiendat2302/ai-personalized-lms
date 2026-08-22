package com.ailms.response;

import com.ailms.entity.enums.CouponDiscountTypeEnum;
import com.ailms.entity.enums.UserCouponStatusEnum;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** DTO voucher thuộc quyền sử dụng của học viên. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserCouponResponse {
    private Long id;
    private Long couponId;
    private String code;
    private CouponDiscountTypeEnum discountType;
    private BigDecimal discountValue;
    private Long applicableCourseId;
    private String applicableCourseName;
    private List<Long> applicableCourseIds;
    private List<String> applicableCourseNames;
    private LocalDateTime validFrom;
    private LocalDateTime validTo;
    private UserCouponStatusEnum status;
    private boolean usable;
    private String unavailableReason;
}
