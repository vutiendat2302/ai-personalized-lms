package com.ailms.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload yêu cầu xác nhận ký phía công ty (dành cho đại diện HR/Admin).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignCompanyRequest {

    /** Mật khẩu xác thực lại (tùy chọn). */
    private String confirmPassword;
}
