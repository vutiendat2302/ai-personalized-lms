package com.ailms.request;

import com.ailms.entity.enums.CoursePackageStatusEnum;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/** Dữ liệu trạng thái mới của gói bán. */
@Getter
@Setter
public class CoursePackageStatusRequest {

    @NotNull(message = "Status is required")
    private CoursePackageStatusEnum status;
}
