package com.ailms.service.imp;

import com.ailms.exception.ForbiddenException;
import com.ailms.security.CustomUserDetails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

/** Ký và xác minh context ngắn hạn để AI Service không tự chọn user hoặc role. */
@Service
public class AiToolAccessTokenService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final long TOKEN_TTL_SECONDS = 300;

    private final String internalToken;

    /** Đọc secret dùng chung với AI Service để ký token nội bộ. */
    public AiToolAccessTokenService(
            @Value("${ai-service.internal-token:${ai-service.interal-token:dev_internal_secret_123}}")
            String internalToken) {
        this.internalToken = internalToken;
    }

    /** Tạo token ngắn hạn chỉ chứa ID và role đã xác thực từ JWT. */
    public String issue(CustomUserDetails currentUser) {
        String roles = currentUser.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(role -> role.startsWith("ROLE_"))
                .map(String::toUpperCase)
                .sorted()
                .reduce((left, right) -> left + "," + right)
                .orElse("");
        String payload = currentUser.getUser().getId() + "|" + roles + "|"
                + Instant.now().plusSeconds(TOKEN_TTL_SECONDS).getEpochSecond();
        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return encodedPayload + "." + signature(encodedPayload);
    }

    /** Xác minh caller nội bộ bằng constant-time comparison. */
    public void verifyInternalToken(String candidate) {
        if (candidate == null || !MessageDigest.isEqual(
                internalToken.getBytes(StandardCharsets.UTF_8),
                candidate.getBytes(StandardCharsets.UTF_8))) {
            throw new ForbiddenException("Yêu cầu tool AI nội bộ không hợp lệ");
        }
    }

    /** Xác minh token và khôi phục user context tin cậy cho tool. */
    public AiToolAccessContext verify(String token) {
        String[] parts = token.split("\\.", 2);
        if (parts.length != 2 || !MessageDigest.isEqual(
                signature(parts[0]).getBytes(StandardCharsets.UTF_8),
                parts[1].getBytes(StandardCharsets.UTF_8))) {
            throw new ForbiddenException("Tool access token không hợp lệ");
        }
        try {
            String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            String[] values = payload.split("\\|", 3);
            if (values.length != 3 || Instant.now().getEpochSecond() > Long.parseLong(values[2])) {
                throw new ForbiddenException("Tool access token đã hết hạn");
            }
            List<String> roles = values[1].isBlank() ? List.of() : List.of(values[1].split(","));
            return new AiToolAccessContext(Long.valueOf(values[0]), roles);
        } catch (IllegalArgumentException exception) {
            throw new ForbiddenException("Tool access token không hợp lệ");
        }
    }

    /** Tạo chữ ký HMAC của payload đã mã hóa. */
    private String signature(String value) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(internalToken.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Không thể ký tool access token", exception);
        }
    }
}
