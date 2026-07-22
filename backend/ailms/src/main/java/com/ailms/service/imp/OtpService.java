package com.ailms.service.imp;
import com.ailms.service.IOtpService;


import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;


@Service
@RequiredArgsConstructor
public class OtpService implements IOtpService {

    /**
     * Prefix dùng để phân biệt OTP đăng ký tài khoản trong Redis.
     * Ví dụ key:
     * otp:register:user@gmail.com
     */
    private static final String OTP_KEY_PREFIX = "otp:";

    /**
     * SecureRandom được sử dụng để sinh OTP an toàn hơn Random/Math.random(),
     * giúp giảm khả năng dự đoán mã OTP.
     */
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * RedisTemplate dùng để thao tác với Redis.
     * Key: String
     * Value: String
     */
    private final RedisTemplate<String, String> redisTemplate;

    /**
     * Thời gian hết hạn của OTP (đơn vị: phút).
     * Giá trị được lấy từ application.yml.
     * Mặc định là 3 phút nếu không cấu hình.
     */
    @Value("${app.otp.expiration-minutes}")
    private int otpExpirationMinutes;

    /**
     * Sinh OTP ngẫu nhiên và lưu vào Redis với thời gian hết hạn.
     * Redis:
     * Key   -> otp:register:user@gmail.com
     * Value -> 483921
     * TTL   -> 3 phút
     *
     * @param email Email của người dùng
     * @param purpose mục đích dùng otp
     * @param ttl thời gian hết hạn
     * @return OTP vừa được sinh
     */
    @Override
    public String generateAndStoreOtp(String email, String purpose, Duration ttl) {
        String otp = generateOtp();
        String key = buildKey(email, purpose);

        // Lưu OTP vào Redis và tự động xóa sau khi hết TTL.
        redisTemplate.opsForValue()
                .set(key, otp, Duration.ofMinutes(otpExpirationMinutes));

        return otp;
    }

    /**
     * Kiểm tra OTP người dùng nhập có khớp với OTP trong Redis hay không.
     *
     * @param email Email người dùng
     * @param purpose muc dich su dung
     * @param otp OTP người dùng nhập
     * @return true nếu OTP hợp lệ, ngược lại false
     */
    @Override
    public boolean verifyOtp(String email, String purpose, String otp) {
        String key = buildKey(email, purpose);

        // Lấy OTP đã lưu trong Redis.
        String storedOtp = redisTemplate.opsForValue().get(key);

        // OTP hợp lệ khi:
        // - Redis vẫn còn lưu OTP (chưa hết hạn)
        // - OTP người dùng nhập trùng với OTP đã lưu
        return storedOtp != null && storedOtp.equals(otp);
    }

    /**
     * Xóa OTP khỏi Redis.
     * Thường được gọi sau khi người dùng xác thực thành công,
     * nhằm đảm bảo OTP chỉ được sử dụng một lần.
     *
     * @param email Email người dùng
     * @param purpose muc dich su dung
     */
    @Override
    public void invalidateOtp(String email, String purpose) {
        redisTemplate.delete(buildKey(email, purpose));
    }

    /**
     * Sinh mã OTP ngẫu nhiên gồm 6 chữ số.
     * nextInt(900000) sinh số từ 0 đến 899999.
     * Cộng thêm 100000 để luôn thu được số từ:
     * 100000 -> 99999
     *
     * @return OTP 6 chữ số
     */
    private String generateOtp() {
        int otpValue = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(otpValue);
    }

    /**
     * Tạo Redis key từ email.
     * otp:register:user@gmail.com
     * @param email Email người dùng
     * @return Redis key
     */
    private String buildKey(String email, String purpose) {
        return OTP_KEY_PREFIX + purpose + ":" + email;
    }
}
