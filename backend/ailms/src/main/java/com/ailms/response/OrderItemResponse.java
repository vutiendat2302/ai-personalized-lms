package com.ailms.response;

import com.ailms.entity.enums.OrderItemTypeEnum;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemResponse {
    private Long id;
    private Long orderId;
    private Long coursePackageId;
    private String coursePackageName;
    private String courseName;
    private String packageName;
    private BigDecimal priceSnapshot;
    private BigDecimal discountSnapshot;
    private BigDecimal finalPrice;
    private OrderItemTypeEnum itemType;
    private Long relatedEnrollmentId;
}
