package com.ailms.service;

import java.time.LocalDateTime;

public interface IEmailService {
    /**
     * Gửi mã OTP xác thực đăng ký tài khoản qua email.
     *
     * @param toEmail Email người nhận.
     * @param otp     Mã OTP cần gửi.
     */
    void sendOtpEmail(String toEmail, String otp);

    /**
     * Gửi email chứa mã OTP đặt lại mật khẩu.
     *
     * @param toEmail Email người nhận.
     * @param otp Mã OTP.
     */
    void sendResetPasswordOtpEmail(String toEmail, String otp);

    /**
     * Gửi email chứa mã OTP để xác thực thay đổi email mới.
     *
     * @param toEmail Email mới.
     * @param otp Mã OTP.
     */
    void sendChangeEmailOtp(String toEmail, String otp);

    /**
     * Gửi email thông báo mật khẩu vừa được thay đổi.
     *
     * <p>Mục đích bảo mật: nếu người dùng KHÔNG phải là người thực hiện
     * thay đổi này, họ cần biết ngay để kịp thời xử lý (report, khóa
     * tài khoản, liên hệ hỗ trợ...).
     * @param toEmail Email người nhận.
     * @param changedAt Thời điểm đổi mật khẩu.
     */
    void sendPasswordChangedNotification(String toEmail, LocalDateTime changedAt);

    /**
     * Gửi email mời tham gia hệ thống.
     * @param toEmail Email người nhận.
     * @param inviteLink Đường dẫn kích hoạt tài khoản.
     */
    void sendInviteEmail(String toEmail, String inviteLink);

}
