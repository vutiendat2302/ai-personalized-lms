package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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

    /** Họ tên do chính người ký xác nhận, dùng để ghi rõ họ tên dưới chữ ký. */
    @NotBlank(message = "Vui lòng nhập họ và tên người ký")
    @Size(max = 100, message = "Họ và tên không được vượt quá 100 ký tự")
    private String signerFullName;

    /** Chữ ký vẽ tay dạng Base64 Data URL (tùy chọn, VD: data:image/png;base64,...). */
    @NotBlank(message = "Vui lòng vẽ chữ ký trước khi xác nhận")
    private String signatureImageBase64;
}
