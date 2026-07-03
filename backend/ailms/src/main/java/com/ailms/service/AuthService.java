package com.ailms.service;

import com.ailms.entity.UserEntity;
import com.ailms.entity.UserStatusEntity;
import com.ailms.repository.UserRepository;
import com.ailms.request.LoginRequest;
import com.ailms.request.RegisterRequest;
import com.ailms.response.JwtAuthenticationResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.ailms.exception.DuplicateResourceException;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AuthService { // login - register
    /**
     * Client
     *     │
     *     ▼
     * AuthController
     *     │
     *     ▼
     * AuthService
     *     │
     *     ├── Đăng ký
     *     │      ▼
     *     │   UserRepository
     *     │
     *     └── Đăng nhập
     *            ▼
     * AuthenticationManager
     *            ▼
     * JwtUtils
     *            ▼
     * JwtAuthenticationResponse
     */

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public String register(RegisterRequest request) {
        if (userRepository.findByUsernameOrEmail(request.getUsername()).isPresent() ||
            userRepository.findByUsernameOrEmail(request.getEmail()).isPresent()) {
            throw DuplicateResourceException.of("User", "username/email", request.getUsername() + "/" + request.getEmail());
        }

        UserEntity userEntity = new UserEntity();
        userEntity.setUsername(request.getUsername());
        userEntity.setEmail(request.getEmail());
        userEntity.setFullName(request.getFullName());
        userEntity.setStatus(UserStatusEntity.ACTIVE);
        userEntity.setDateOfBirth(request.getDateOfBirth() != null
                ? request.getDateOfBirth().atStartOfDay()
                : null);
        // Encode password before saving
        userEntity.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        userRepository.save(userEntity);

        return "User registered successfully!";
    }

    public JwtAuthenticationResponse login(LoginRequest loginRequest) {
        /*
         * Username
         * ↓
         * DaoAuthenticationProvider
         * ↓
         * CustomUserDetailsService
         * ↓
         * UserRepository
         * ↓
         * PasswordEncoder
         * ↓
         * So sánh mật khẩu
         * ↓
         * Authentication
         */
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsernameOrEmail(),
                        loginRequest.getPassword()
                )
        );

        // Luu thong tin user vao context
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        // Extract roles and permissions from authorities
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(Objects::nonNull)
                .filter(auth -> auth.startsWith("ROLE_"))
                .toList();

        List<String> permissions = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(Objects::nonNull)
                .filter(auth -> !auth.startsWith("ROLE_"))
                .toList();

        return JwtAuthenticationResponse.builder()
                .accessToken(jwt)
                .id(userDetails.getUser().getId())
                .username(userDetails.getUsername())
                .email(userDetails.getUser().getEmail())
                .fullName(userDetails.getUser().getFullName())
                .roles(roles)
                .permissions(permissions)
                .build();
    }
}
