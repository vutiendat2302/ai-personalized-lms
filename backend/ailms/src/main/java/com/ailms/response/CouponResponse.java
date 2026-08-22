package com.ailms.response;

import com.ailms.entity.enums.CouponDiscountTypeEnum;
import com.ailms.entity.enums.CouponStatusEnum;
import com.ailms.entity.enums.CouponDistributionScopeEnum;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponResponse {
    private Long id;
    private String code;
    private CouponDiscountTypeEnum discountType;
    private BigDecimal discountValue;
    private Long applicableCourseId;
    private String applicableCourseName;
    private List<Long> applicableCourseIds;
    private List<String> applicableCourseNames;
    private Integer maxUsage;
    private Integer usedCount;
    private LocalDateTime validFrom;
    private LocalDateTime validTo;
    private CouponStatusEnum status;
    private CouponDistributionScopeEnum distributionScope;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
