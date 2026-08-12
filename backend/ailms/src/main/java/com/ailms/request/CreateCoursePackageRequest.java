package com.ailms.request;

import com.ailms.entity.enums.DeliveryModeEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;

/** Dữ liệu bắt buộc để tạo gói khóa học với mã do backend tự sinh. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCoursePackageRequest {

    @NotNull(message = "Course ID is required")
    private Long courseId;

    private Long classId;

    @NotBlank(message = "Package name is required")
    @Size(max = 100, message = "Package name must not exceed 100 characters")
    private String name;

    private String description;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Price must be greater than or equal to 0")
    private BigDecimal price;

    @NotNull(message = "Original price is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Original price must be greater than or equal to 0")
    private BigDecimal originalPrice;

    @NotNull(message = "Delivery mode is required")
    private DeliveryModeEnum deliveryMode;

    @Min(value = 1, message = "Duration days must be greater than 0")
    private Integer durationDays;

    @Min(value = 0, message = "Included tutor sessions must be greater than or equal to 0")
    private Integer includedTutorSessions;

    @Min(value = 1, message = "Maximum group size must be greater than 0")
    private Integer maxGroupSize;
}
