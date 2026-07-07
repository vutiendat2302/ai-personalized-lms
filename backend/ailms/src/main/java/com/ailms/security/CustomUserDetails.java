package com.ailms.security;

import com.ailms.entity.UserEntity;
import com.ailms.entity.UserStatusEntity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.NonNull;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

/**
 * Triển khai {@link UserDetails} của Spring Security.
 *
 * <p>Lớp này đóng vai trò là cầu nối giữa {@link UserEntity}
 * và Spring Security, cung cấp thông tin người dùng phục vụ
 * quá trình xác thực (Authentication) và phân quyền (Authorization).
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CustomUserDetails implements UserDetails {

    /**
     * Thông tin người dùng trong hệ thống.
     */
    private UserEntity user;

    /**
     * Danh sách quyền (roles/permissions) của người dùng.
     */
    private Collection<? extends GrantedAuthority> authorities;

    /**
     * Trả về danh sách quyền của người dùng.
     */
    @Override
    @NonNull
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    /**
     * Trả về mật khẩu đã được mã hóa.
     */
    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    /**
     * Trả về tên đăng nhập của người dùng.
     */
    @Override
    @NonNull
    public String getUsername() {
        return user.getUsername();
    }

    /**
     * Kiểm tra tài khoản (account) có bị hết hạn hay không.
     *
     * <p>Lưu ý: đây là hạn sử dụng của <b>tài khoản</b> (ví dụ tài khoản
     * dùng thử, tài khoản theo hợp đồng/học kỳ), khác với việc
     * <b>JWT token</b> hết hạn — JWT hết hạn đã được xử lý riêng ở
     * {@code JwtUtils#validateJwtToken} và không liên quan đến field này.
     *
     * <p>Hệ thống hiện tại không áp dụng chính sách hết hạn tài khoản
     * theo thời gian, nên luôn trả về {@code true}.
     */
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    /**
     * Kiểm tra tài khoản có bị khóa hay không.
     * Người dùng có trạng thái {@code LOCKED}
     * sẽ không thể đăng nhập.
     */
    @Override
    public boolean isAccountNonLocked() {
        return user.getStatus() != UserStatusEntity.LOCKED;
    }

    /**
     * Kiểm tra thông tin xác thực (mật khẩu) có hết hạn hay không.
     * <p>Hiện tại hệ thống chưa áp dụng chính sách hết hạn mật khẩu,
     * nên luôn trả về {@code true}.
     */
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    /**
     * Kiểm tra tài khoản có đang hoạt động hay không.
     * <p>Chỉ những tài khoản có trạng thái {@code ACTIVE}
     * mới được phép xác thực.
     */
    @Override
    public boolean isEnabled() {
        return user.getStatus() == UserStatusEntity.ACTIVE;
    }
}
