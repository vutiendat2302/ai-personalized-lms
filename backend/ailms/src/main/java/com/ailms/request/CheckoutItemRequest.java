package com.ailms.request;

import com.ailms.entity.enums.OrderItemTypeEnum;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutItemRequest {

    @NotNull(message = "Course Package ID is required")
    private Long coursePackageId;

    @NotNull(message = "Item type is required")
    private OrderItemTypeEnum itemType;

    private Long relatedEnrollmentId;
}
