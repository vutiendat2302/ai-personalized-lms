package com.ailms.response;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Phản hồi sau khi người dùng xác thực thành công.
 * Chứa Access Token để client sử dụng cho các request tiếp theo
 * cùng với thông tin cơ bản của người dùng đã đăng nhập.
 */

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JwtAuthenticationResponse {

    /**
     * JWT Access Token dùng để xác thực các request đến API.
     */
    private String accessToken;

    /**
     * Loại token được sử dụng trong Authorization Header.
     * Mặc định là "Bearer".
     */
    @Builder.Default
    private String tokenType = "Bearer"; // bearer: người mang token

    /**
     * Refresh Token dùng để cấp mới Access Token khi hết hạn.
     * Không được trả về trong JSON response. (JsonIgnore). Lưu trong cookie trình duyệt.
     */
    @JsonIgnore
    private String refreshToken;

    /**
     * ID của người dùng.
     */
    private Long id;

    /**
     * Tên đăng nhập.
     */
    private String username;

    /**
     * Địa chỉ email.
     */
    private String email;

    /**
     * Họ và tên của người dùng.
     */
    private String fullName;

    /**
     * Danh sách vai trò của người dùng.
     * Ví dụ: ["ROLE_ADMIN", "ROLE_STUDENT"].
     */
    private List<String> roles;

    /**
     * Danh sách quyền (permissions) của người dùng.
     * Ví dụ: ["course:create", "user:read"].
     */
    private List<String> permissions;
}
