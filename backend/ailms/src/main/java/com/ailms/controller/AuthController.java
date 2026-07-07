package com.ailms.controller;

import com.ailms.request.*;
import com.ailms.response.ApiResponse;
import com.ailms.response.JwtAuthenticationResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IAuthService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${api.auth-prefix}")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final IAuthService authService;

    @Value("${app.jwt.refresh-expiration-ms}")
    private int refreshExpirationMs;

    @Value("${app.cookie.secure}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site}")
    private String cookieSameSite;

    private ResponseCookie buildRefreshCookie(String token) {
        return ResponseCookie.from("refresh_token", token)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .sameSite(cookieSameSite)
                .maxAge(refreshExpirationMs / 1000)
                .build();
    }


    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtAuthenticationResponse>> authenticateUser(
            @Valid @RequestBody LoginRequest loginRequest) {
        JwtAuthenticationResponse jwtResponse = authService.login(loginRequest);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(jwtResponse.getRefreshToken()).toString())
                .body(ApiResponse.of("Đăng nhập thành công", jwtResponse));
    }


    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<JwtAuthenticationResponse>> refreshToken(
            @CookieValue(name = "refresh_token", required = false) String refreshToken) {

        if (refreshToken == null || refreshToken.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.message("Refresh token không tồn tại"));
        }

        JwtAuthenticationResponse jwtResponse = authService.refreshToken(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(jwtResponse.getRefreshToken()).toString())
                .body(ApiResponse.of("Làm mới token thành công", jwtResponse));
    }


    /**
     * Controller test luồng đăng ký + xác thực OTP qua email (Redis).
     *
     * <p>Dùng để test nhanh: gọi {@code POST /api/auth/register} trước,
     * kiểm tra email nhận OTP, sau đó gọi {@code POST /api/auth/verify-otp}
     * để kích hoạt tài khoản.
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        log.info("Đăng ký tài khoản mới cho email: {}", registerRequest.getEmail());
        authService.register(registerRequest);
        return ResponseEntity.ok(ApiResponse.message("OTP đã được gửi tới email của bạn"));
    }

    /**
     * Xác thực mã OTP, kích hoạt tài khoản nếu hợp lệ.
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<Void>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        log.info("Xác thực OTP cho email: {}", request.getEmail());
        authService.verifyRegistrationOtp(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(ApiResponse.message("Xác thực tài khoản thành công"));
    }

    /**
     * Gửi lại OTP mới nếu mã cũ hết hạn hoặc chưa nhận được email.
     */
    @PostMapping("/resend-otp")
    public ResponseEntity<ApiResponse<Void>> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        log.info("Gửi lại OTP cho email: {}", request.getEmail());
        authService.resendOtp(request.getEmail());
        return ResponseEntity.ok(ApiResponse.message("Đã gửi lại OTP, vui lòng kiểm tra email"));
    }

    /**
     * Đổi mật khẩu cho người dùng đang đăng nhập.
     */
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getUser().getId();

        log.info("Yêu cầu đổi mật khẩu cho user ID: {}", userId);
        authService.changePassword(userId, request);

        return ResponseEntity.ok(ApiResponse.message("Đổi mật khẩu thành công"));
    }

    /**
     * Yêu cầu quên mật khẩu.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        log.info("Yêu cầu quên mật khẩu cho thông tin: {}", request.getUsernameOrEmail());
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.message("Đã gửi OTP đặt lại mật khẩu tới email của bạn"));
    }

    /**
     * Gửi lại mã OTP đặt lại mật khẩu, nếu mã cũ hết hạn hoặc chưa nhận được email.
     */
    @PostMapping("/resend-forgot-password-otp")
    public ResponseEntity<ApiResponse<Void>> resendForgotPasswordOtp(
            @Valid @RequestBody ResendOtpRequest request) {
        log.info("Yêu cầu gửi lại OTP quên mật khẩu cho thông tin: {}", request.getEmail());
        authService.resendForgotPasswordOtp(request.getEmail());
        return ResponseEntity.ok(ApiResponse.message("Đã gửi lại OTP đặt lại mật khẩu"));
    }

    /**
     * Đặt lại mật khẩu (với mã OTP).
     */
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        log.info("Yêu cầu đặt lại mật khẩu với OTP cho thông tin: {}", request.getUsernameOrEmail());
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.message("Đặt lại mật khẩu thành công"));
    }
}
