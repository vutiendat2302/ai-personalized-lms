package com.ailms.request.support;

import com.ailms.entity.enums.CourseLevelEnum;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Lựa chọn guided đã hoàn tất dùng để truy vấn semantic catalog công khai. */
public record GuidedRecommendationRequest(
        @NotNull Long categoryId,
        @NotNull CourseLevelEnum level,
        @Size(max = 40) String goal,
        @Min(1) @Max(12) Integer limit) {
}
