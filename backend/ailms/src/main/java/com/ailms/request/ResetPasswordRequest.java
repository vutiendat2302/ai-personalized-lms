package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Sau khi Forgot Password sẽ được nhận một mã OTP, đổi mật khẩu
 */
@Data
public class ResetPasswordRequest {

    /**
     * Username hoặc email dùng để đăng nhập.
     * Điều kiện:
     * - Không được để trống.
     * - Độ dài từ 6 ky tu trở lên.
     * - Không được chứa khoảng trắng.
     */
    @NotBlank(message = "Username or email cannot be blank")
    @Size(
            min = 6,
            message = "Username or email must be between 3 and 100 characters"
    )
    @Pattern(
            regexp = "^\\S+$",
            message = "Username or email must not contain spaces"
    )
    private String usernameOrEmail;

    @NotBlank(message = "Mã OTP không được để trống")
    @Size(min = 6, max = 6, message = "Mã OTP phải có 6 chữ số")
    @Pattern(regexp = "^[0-9]{6}$", message = "Mã OTP phải là 6 chữ số")
    private String otp;

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
    private String newPassword;

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
    private String confirmPassword;
}
