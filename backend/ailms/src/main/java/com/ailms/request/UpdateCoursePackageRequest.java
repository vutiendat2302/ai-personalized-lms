package com.ailms.request;

import com.ailms.entity.enums.CoursePackageStatusEnum;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/** Dữ liệu được phép thay đổi của một gói khóa học, không bao gồm mã gói. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateCoursePackageRequest {
    /** Lớp nhóm đính kèm; bắt buộc cho GROUP_CLASS. */
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

    @Min(value = 1, message = "Duration days must be greater than 0")
    private Integer durationDays;

    @Min(value = 0, message = "Included tutor sessions must be greater than or equal to 0")
    private Integer includedTutorSessions;

    @Min(value = 1, message = "Maximum group size must be greater than 0")
    private Integer maxGroupSize;

    @NotNull(message = "Status is required")
    private CoursePackageStatusEnum status;
}
