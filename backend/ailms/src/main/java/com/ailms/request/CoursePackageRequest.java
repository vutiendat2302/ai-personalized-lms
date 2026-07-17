package com.ailms.request;

import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoursePackageRequest {

    @NotNull(message = "Course ID is required")
    private Long courseId;

    @NotBlank(message = "Package name is required")
    private String name;

    @NotNull(message = "Delivery mode is required")
    private DeliveryModeEnum deliveryMode;

    @NotNull(message = "Price is required")
    private BigDecimal price;

    @NotNull(message = "Original price is required")
    private BigDecimal originalPrice;

    private Integer durationDays;

    private Integer includedTutorSessions;

    private Integer maxGroupSize;

    @NotNull(message = "Status is required")
    private CoursePackageStatusEnum status;
}
