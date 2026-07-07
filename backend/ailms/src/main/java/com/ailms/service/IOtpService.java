package com.ailms.service;

import java.time.Duration;

public interface IOtpService {
    /**
     * Sinh mã OTP 6 số, lưu vào Redis với TTL, gắn theo email.
     *
     * @param email Email của người dùng cần xác thực.
     * @param purpose    Mục đích dùng OTP (vd: "register", "forgot-password"),
     * @param ttl        Thời gian sống của OTP.
     * @return Mã OTP vừa sinh (dùng để gửi email).
     */
    String generateAndStoreOtp(String email, String purpose, Duration ttl);

    /**
     * Kiểm tra mã OTP người dùng nhập có khớp và còn hạn không.
     *
     * @param email Email cần xác thực.
     * @param purpose    Mục đích dùng OTP (vd: "register", "forgot-password"),
     * @param otp   Mã OTP người dùng nhập.
     * @return true nếu hợp lệ.
     */
    boolean verifyOtp(String email, String purpose, String otp);

    /**
     * Xoá OTP khỏi Redis sau khi xác thực thành công
     * (tránh dùng lại mã cũ).
     *
     * @param email Email cần xoá OTP.
     * @param purpose    Mục đích dùng OTP (vd: "register", "forgot-password"),
     */
    void invalidateOtp(String email, String purpose);
}
