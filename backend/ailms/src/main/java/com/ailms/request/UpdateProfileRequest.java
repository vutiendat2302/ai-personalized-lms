package com.ailms.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class UpdateProfileRequest {

    /**
     * Họ và tên đầy đủ.
     */
    private String fullName;

    /**
     * Số điện thoại Việt Nam.
     * Cho phép để trống.
     */
    @Pattern(regexp = "^(0|\\+84)[35789][0-9]{8}$", message = "Phone number is invalid")
    private String phone;

    /**
     * Ngày sinh.
     * Phải nhỏ hơn ngày hiện tại.
     */
    @JsonFormat(pattern = "yyyy-MM-dd")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    /**
     * Giới tính.
     * 0 - Male
     * 1 - Female
     * 2 - Other
     */
    @Min(value = 0, message = "Gender is invalid")
    @Max(value = 2, message = "Gender is invalid")
    private Integer gender;

    /**
     * Đường dẫn ảnh đại diện.
     */
    private String avatarUrl;

    /**
     * Thông tin mở rộng dưới dạng JSON string.
     */
    private String attributes;
}
