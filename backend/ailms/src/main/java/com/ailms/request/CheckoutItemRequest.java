package com.ailms.request;

import com.ailms.entity.enums.OrderItemTypeEnum;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutItemRequest {

    @NotNull(message = "Course Package ID is required")
    private Long coursePackageId;

    private OrderItemTypeEnum itemType;

    private Long relatedEnrollmentId;

    /** Nhu cầu học tập riêng của dòng ONE_ON_ONE trong checkout giỏ hàng. */
    @Valid
    private OneOnOneNeedsRequest oneOnOneNeeds;
}
