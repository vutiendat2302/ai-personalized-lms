package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Xác nhận email khi đổi mail
 */
@Data
public class VerifyEmailChangeRequest {

    /**
     * Mã OTP được gửi tới email mới để xác nhận thay đổi địa chỉ email.
     * Sau khi xác thực thành công, hệ thống sẽ cập nhật
     * email mới cho tài khoản của người dùng.
     */
    @NotBlank(message = "Mã OTP không được để trống")
    private String otp;
}
