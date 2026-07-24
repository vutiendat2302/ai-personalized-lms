package com.ailms.request;

import com.ailms.entity.enums.DeliveryModeEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCoursePackageRequest {

    @NotNull(message = "Course ID is required")
    private Long courseId;

    private Long classId; // Null for SELF_STUDY or ONE_ON_ONE

    @NotBlank(message = "Package name is required")
    private String name;

    private String description;

    @NotNull(message = "Price is required")
    private BigDecimal price;

    @NotNull(message = "Duration days is required")
    private Integer durationDays;

    @NotNull(message = "Delivery mode is required")
    private DeliveryModeEnum deliveryMode; // SELF_STUDY, GROUP_CLASS, ONE_ON_ONE
}
