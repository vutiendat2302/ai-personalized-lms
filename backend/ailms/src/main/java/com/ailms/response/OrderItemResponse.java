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
    private Long coursePackageId;
    private String coursePackageName;
    private BigDecimal priceSnapshot;
    private OrderItemTypeEnum itemType;
    private Long relatedEnrollmentId;
}
