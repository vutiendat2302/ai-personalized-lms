package com.ailms.service;

import java.time.LocalDate;
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

    /**
     * Gửi email chứa liên kết thiết lập mật khẩu.
     * @param toEmail Email người nhận.
     * @param token Token xác thực.
     */
    void sendSetPasswordEmail(String toEmail, String token);

    /**
     * Gửi email thông báo ký kết hợp đồng lao động mới.
     * @param toEmail Email nhân viên.
     * @param fullName Họ tên nhân viên.
     * @param contractType Loại hợp đồng.
     * @param downloadUrl Đường dẫn tải file hợp đồng.
     */
    void sendContractNotificationEmail(String toEmail, String fullName, String contractType, String downloadUrl);

    /**
     * Gửi email cảnh báo hợp đồng lao động sắp hết hạn.
     * @param toEmail Email HR/Admin nhận.
     * @param employeeName Tên nhân viên sở hữu hợp đồng.
     * @param contractCode Mã/Loại hợp đồng.
     * @param endDate Ngày hết hạn.
     */
    void sendContractExpirationAlertEmail(String toEmail, String employeeName, String contractCode, LocalDate endDate);
}
