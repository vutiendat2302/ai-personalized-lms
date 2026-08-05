package com.ailms.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    /**
     * Username dùng để đăng nhập.
     * Điều kiện:
     * - Không được để trống.
     * - Độ dài từ 3 đến 50 ký tự.
     * - Chỉ gồm chữ cái, chữ số, dấu chấm (.), gạch dưới (_) và gạch ngang (-).
     * - Không được chứa khoảng trắng.
     */
    @NotBlank(message = "Username cannot be blank")
    @Size(min = 6, max = 50, message = "Username must be between 6 and 50 characters")
    @Pattern(
            regexp = "^[a-zA-Z0-9._-]+$",
            message = "Username may only contain letters, numbers, dots (.), underscores (_) and hyphens (-)"
    )
    private String username;

    /**
     * Địa chỉ email dùng để xác thực tài khoản và đăng nhập.
     */
    @NotBlank(message = "Email cannot be blank")
    @Email(message = "Email should be valid")
    private String email;

    /**
     * Mật khẩu
     * Điều kiện:
     * - Không được để trống.
     * - Độ dài từ 6 đến 100 ký tự.
     * - Có ít nhất 1 chữ hoa.
     * - Có ít nhất 1 chữ thường.
     * - Có ít nhất 1 chữ số.
     * - Không được chứa khoảng trắng.
     */
    @NotBlank(message = "Password cannot be blank")
    @Size(min = 6, max = 100, message = "Mật khẩu phải từ 6-100 ký tự")
    @Pattern(
            regexp = "^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z])\\S{6,}$",
            message = "Password must contain at least one uppercase letter, one lowercase letter, one digit and must not contain spaces"
    )
    private String password;

    /**
     * Họ và tên đầy đủ.
     */
    private String fullName;

    /**
     * Số điện thoại Việt Nam.
     * Cho phép để trống.
     */
    @Pattern(regexp = "^$|^[0-9\\+\\(\\)\\s\\.-]{8,20}$", message = "Phone number is invalid")
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
}
