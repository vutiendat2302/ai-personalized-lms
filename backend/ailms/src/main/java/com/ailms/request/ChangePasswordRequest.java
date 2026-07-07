package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {

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
    private String oldPassword;

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
