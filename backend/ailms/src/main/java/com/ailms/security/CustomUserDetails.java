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

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomUserDetails implements UserDetails {

    private UserEntity user;
    private Collection<? extends GrantedAuthority> authorities;

    @Override
    @NonNull
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    @Override
    @NonNull
    public String getUsername() {
        return user.getUsername();
    }

    // Set time cho tai khoan, bổ sung sau
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    // Tk khong bi khoa
    @Override
    public boolean isAccountNonLocked() {
        return user.getStatus() != UserStatusEntity.LOCKED;
    }

    // Yeu cau doi mk sau X ngay, bo sung sau
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    // Tkhoan duoc kich hoat
    @Override
    public boolean isEnabled() {
        return user.getStatus() == UserStatusEntity.ACTIVE;
    }
}
