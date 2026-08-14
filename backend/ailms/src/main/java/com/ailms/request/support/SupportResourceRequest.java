package com.ailms.request.support;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Tài nguyên catalog thật mà tư vấn viên muốn gửi vào conversation. */
public record SupportResourceRequest(
        @NotBlank @Pattern(regexp = "COURSE|CATEGORY|PACKAGE") String resourceType,
        @NotBlank @Size(max = 30) String resourceId) {
}
