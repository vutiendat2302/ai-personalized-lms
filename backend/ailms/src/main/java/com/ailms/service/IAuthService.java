package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.JwtAuthenticationResponse;

/**
 * Service xử lý xác thực và phân quyền người dùng (đăng ký, đăng nhập, OTP, mật khẩu).
 */
public interface IAuthService {

    /**
     * Đăng ký tài khoản người dùng mới.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void register(RegisterRequest request);

    /**
     * Xác thực mã OTP đăng ký tài khoản.
     *
     * @param email Địa chỉ thư điện tử (email) nhận tin
     * @param otp Mã OTP xác thực
     */
    void verifyRegistrationOtp(String email, String otp);

    /**
     * Gửi lại mã OTP xác thực tài khoản.
     *
     * @param usernameOrEmail Tên đăng nhập hoặc địa chỉ email tài khoản
     */
    void resendOtp(String usernameOrEmail);

    /**
     * Đăng nhập hệ thống bằng tài khoản và mật khẩu.
     *
     * @param loginRequest Tham số loginRequest
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    JwtAuthenticationResponse login(LoginRequest loginRequest);

    /**
     * Làm mới mã truy cập (Access Token) từ Refresh Token.
     *
     * @param refreshToken Tham số refreshToken
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    JwtAuthenticationResponse refreshToken(String refreshToken);

    /**
     * Thay đổi mật khẩu tài khoản người dùng.
     *
     * @param userId ID của người dùng (User)
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void changePassword(Long userId, ChangePasswordRequest request);

    /**
     * Yêu cầu khôi phục mật khẩu khi quên.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void forgotPassword(ForgotPasswordRequest request);

    /**
     * Đặt lại mật khẩu mới bằng OTP xác thực.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void resetPassword(ResetPasswordRequest request);

    /**
     * Gửi lại OTP khôi phục mật khẩu.
     *
     * @param usernameOrEmail Tên đăng nhập hoặc địa chỉ email tài khoản
     */
    void resendForgotPasswordOtp(String usernameOrEmail);

    /**
     * Đặt mật khẩu lần đầu cho tài khoản được mời.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void setPassword(SetPasswordRequest request);
}
