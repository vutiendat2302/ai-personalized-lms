package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload xác nhận ký điện tử từ phía nhân viên qua link công khai.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignEmployeeConfirmRequest {

    /** Mã OTP 6 chữ số gửi về email/SĐT nhân viên. */
    @NotBlank(message = "Mã OTP xác thực không được để trống")
    private String otp;

    /** Chữ ký vẽ tay dạng Base64 Data URL (tùy chọn, VD: data:image/png;base64,...). */
    private String signatureImageBase64;
}
