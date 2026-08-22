package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.Setter;

/** Yêu cầu thêm một gói học vào giỏ hàng của học viên. */
@Getter
@Setter
public class StudentCartAddRequest {
    @NotNull(message = "Course package ID is required")
    private Long coursePackageId;

    /** Bản nháp bắt buộc khi package có quyền lợi gia sư 1-1. */
    @Valid
    private OneOnOneNeedsRequest oneOnOneNeeds;
}
