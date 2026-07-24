package com.ailms.service;

import java.time.Duration;

/**
 * Service tạo, lưu trữ và xác thực mã OTP bảo mật.
 */
public interface IOtpService {

    /**
     * Tạo và lưu trữ mã OTP ngẫu nhiên cho một mục đích cụ thể.
     *
     * @param email Địa chỉ thư điện tử (email) nhận tin
     * @param purpose Mục đích sử dụng mã OTP
     * @param ttl Thời gian sống (Time To Live) của mã OTP
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    String generateAndStoreOtp(String email, String purpose, Duration ttl);

    /**
     * Xác thực mã OTP do người dùng nhập.
     *
     * @param email Địa chỉ thư điện tử (email) nhận tin
     * @param purpose Mục đích sử dụng mã OTP
     * @param otp Mã OTP xác thực
     * @return true nếu xử lý thành công hoặc hợp lệ, ngược lại là false
     */
    boolean verifyOtp(String email, String purpose, String otp);

    /**
     * Vô hiệu hóa mã OTP ngay lập tức.
     *
     * @param email Địa chỉ thư điện tử (email) nhận tin
     * @param purpose Mục đích sử dụng mã OTP
     */
    void invalidateOtp(String email, String purpose);
}
