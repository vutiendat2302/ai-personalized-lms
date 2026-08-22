package com.ailms.request.support;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Thông tin liên hệ tối thiểu để chuyển guided chat tới HR. */
public record ContactRequest(
        @NotBlank @Size(max = 120) String fullName,
        @Pattern(regexp = "^$|^(\\+84|0)(3|5|7|8|9)[0-9]{8}$", message = "Số điện thoại không hợp lệ") String phone,
        @NotBlank @Email @Size(max = 255) String email,
        @Size(max = 1000) String note) {
}
