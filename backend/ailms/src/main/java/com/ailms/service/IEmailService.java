package com.ailms.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Service gửi email thông báo, OTP, lời mời và cảnh báo từ hệ thống.
 */
public interface IEmailService {

    /**
     * Gửi email chứa mã OTP xác thực tài khoản.
     *
     * @param toEmail Tham số toEmail
     * @param otp Mã OTP xác thực
     */
    void sendOtpEmail(String toEmail, String otp);

    /**
     * Gửi email chứa mã OTP để khôi phục mật khẩu.
     *
     * @param toEmail Tham số toEmail
     * @param otp Mã OTP xác thực
     */
    void sendResetPasswordOtpEmail(String toEmail, String otp);

    /**
     * Gửi email chứa mã OTP để xác nhận thay đổi địa chỉ email.
     *
     * @param toEmail Tham số toEmail
     * @param otp Mã OTP xác thực
     */
    void sendChangeEmailOtp(String toEmail, String otp);

    /**
     * Gửi email thông báo mật khẩu tài khoản đã được thay đổi.
     *
     * @param toEmail Tham số toEmail
     * @param changedAt Tham số changedAt
     */
    void sendPasswordChangedNotification(String toEmail, LocalDateTime changedAt);

    /**
     * Gửi email mời tham gia hệ thống kèm theo liên kết đăng ký.
     *
     * @param toEmail Tham số toEmail
     * @param inviteLink Tham số inviteLink
     */
    void sendInviteEmail(String toEmail, String inviteLink);

    /**
     * Gửi email hướng dẫn thiết lập mật khẩu kèm token xác thực.
     *
     * @param toEmail Tham số toEmail
     * @param token Tham số token
     */
    void sendSetPasswordEmail(String toEmail, String token);

    /**
     * Gửi email thông báo về hợp đồng lao động mới kèm link tải.
     *
     * @param toEmail Tham số toEmail
     * @param fullName Tham số fullName
     * @param contractType Tham số contractType
     * @param downloadUrl Tham số downloadUrl
     */
    void sendContractNotificationEmail(String toEmail, String fullName, String contractType, String downloadUrl);

    /**
     * Gửi email cảnh báo hợp đồng lao động sắp hết hạn.
     *
     * @param toEmail Tham số toEmail
     * @param employeeName Tham số employeeName
     * @param contractCode Tham số contractCode
     * @param endDate Tham số endDate
     */
    void sendContractExpirationAlertEmail(String toEmail, String employeeName, String contractCode, LocalDate endDate);

    /**
     * Gửi email thông báo mời ký điện tử hợp đồng lao động kèm link công khai.
     */
    void sendContractSigningLinkEmail(String toEmail, String employeeName, String signingLink, String otp,
                                      String setPasswordToken, LocalDateTime expiresAt);

    /**
     * Gửi email chứa mã OTP 6 chữ số phục vụ ký điện tử hợp đồng lao động.
     */
    void sendContractSigningOtpEmail(String toEmail, String employeeName, String otp);

    /**
     * Gửi email tùy chỉnh đến nhiều tài khoản cùng lúc.
     *
     * @param toEmails Danh sách địa chỉ email người nhận
     * @param subject Tiêu đề email
     * @param content Nội dung email
     */
    void sendBulkEmail(List<String> toEmails, String subject, String content);
}
