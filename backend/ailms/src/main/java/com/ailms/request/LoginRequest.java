package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

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

    /**
     * Mật khẩu dùng để đăng nhập.
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
}
