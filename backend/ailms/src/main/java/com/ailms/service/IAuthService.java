package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.JwtAuthenticationResponse;

/**
 * Contract cho các nghiệp vụ xác thực người dùng: đăng ký, đăng nhập,
 * và cấp lại Access Token thông qua Refresh Token.
 */
public interface IAuthService {
    /**
     * Đăng ký tài khoản mới.
     *
     * @param request Thông tin đăng ký (username, email, password...).
     * @return Thông báo kết quả đăng ký.
     */
    void register(RegisterRequest request);

    /**
     * Xác thực mã OTP người dùng nhận qua email sau khi đăng ký.
     * Nếu hợp lệ, kích hoạt tài khoản (chuyển status sang ACTIVE).
     *
     * @param email Email cần xác thực.
     * @param otp   Mã OTP người dùng nhập.
     * @return Thông báo kết quả xác thực.
     */
    void verifyRegistrationOtp(String email, String otp);

    /**
     * Gửi lại mã OTP mới nếu người dùng chưa nhận được
     * hoặc mã cũ đã hết hạn.
     *
     * @param email Email cần gửi lại OTP.
     * @return Thông báo kết quả.
     */
    void resendOtp(String email);

    /**
     * Xác thực người dùng bằng username/email và mật khẩu,
     * trả về Access Token + Refresh Token nếu thành công.
     *
     * @param loginRequest Thông tin đăng nhập.
     * @return {@link JwtAuthenticationResponse} chứa token và thông tin user.
     */
    JwtAuthenticationResponse login(LoginRequest loginRequest);

    /**
     * Cấp mới Access Token và Refresh Token dựa trên Refresh Token hợp lệ.
     *
     * @param refreshToken Refresh Token hiện tại của người dùng.
     * @return {@link JwtAuthenticationResponse} chứa token mới và thông tin user.
     */
    JwtAuthenticationResponse refreshToken(String refreshToken);

    /**
     * Thay đổi mật khẩu người dùng đang đăng nhập.
     *
     * @param userId Id của người dùng.
     * @param request Thông tin mật khẩu cũ và mới.
     */
    void changePassword(Long userId, ChangePasswordRequest request);

    /**
     * Yêu cầu quên mật khẩu.
     */
    void forgotPassword(ForgotPasswordRequest request);

    /**
     * Đặt lại mật khẩu.
     */
    void resetPassword(ResetPasswordRequest request);

    /**
     * Gửi lại mã OTP đặt lại mật khẩu nếu mã cũ hết hạn hoặc chưa nhận được email.
     *
     * @param usernameOrEmail Username hoặc email của người dùng.
     * @return Thông báo kết quả.
     */
    void resendForgotPasswordOtp(String usernameOrEmail);
}
