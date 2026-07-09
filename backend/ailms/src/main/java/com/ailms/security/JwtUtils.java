package com.ailms.security;

import com.ailms.exception.InvalidTokenException;
import com.ailms.exception.TokenExpiredException;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.validation.constraints.NotBlank;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Component
public class JwtUtils {

    /**
     * Đăng nhập
     *     │
     *     ▼
     * Username + Password
     *     │
     *     ▼
     * Spring Security xác thực
     *     │
     *     ▼
     * Authentication
     *     │
     *     ▼
     * JwtUtils.generateJwtToken()
     *     │
     *     ▼
     * JWT
     *     │
     *     ▼
     * Client lưu JWT
     *     │
     *     ▼
     * Authorization: Bearer xxxxx
     *     │
     *     ▼
     * JwtAuthFilter
     *     │
     *     ▼
     * JwtUtils.validateJwtToken()
     *     │
     *     ▼
     * JwtUtils.getUserNameFromJwtToken()
     */

    @Value("${app.jwt.secret}") // HS256 token
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}") // access token
    private int jwtExpirationMs;

    private final static int EXPIRATION_PASSWORD_TOKEN = 86400000;

    @Value("${app.jwt.refresh-expiration-ms}") // refresh token
    private int refreshExpirationMs;

    private SecretKey key() { // create secret key from jwtSecret (access token)
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    public String generateRefreshToken(String username) { // refresh token)
        return Jwts.builder()
                .subject(username)
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date())
                .expiration(new Date((new Date()).getTime() + refreshExpirationMs))
                .signWith(key(), Jwts.SIG.HS256)
                .compact();
    }

    public String generateJwtToken(Authentication authentication) {

        CustomUserDetails userPrincipal = (CustomUserDetails) authentication.getPrincipal();

        // Optional: Add roles/permissions directly to JWT claims if needed for frontend
        String authorities = userPrincipal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.joining(","));

        return Jwts.builder()
                .subject(userPrincipal.getUsername())
                .id(UUID.randomUUID().toString())
                .claim("id", userPrincipal.getUser().getId())
                .claim("authorities", authorities) // roles and permissions
                .issuedAt(new Date())
                .expiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key(), Jwts.SIG.HS256) // login with key or jwt 256 (access token)
                .compact();
    }

    public String generateSetPasswordToken(Long userId) {
        return Jwts.builder()
                .subject(userId.toString())
                .id(UUID.randomUUID().toString())
                .claim("type", "invite")
                .issuedAt(new Date())
                .expiration(new Date((new Date()).getTime() + EXPIRATION_PASSWORD_TOKEN))
                .signWith(key(), Jwts.SIG.HS256) // login with key or jwt 256 (access token)
                .compact();
    }

    public String getUserNameFromJwtToken(String token) {
        return Jwts.parser().verifyWith(key()).build()
                .parseSignedClaims(token).getPayload().getSubject();
    }

    public Date getIssuedAtFromJwtToken(String token) {
        return Jwts.parser().verifyWith(key()).build()
                .parseSignedClaims(token).getPayload().getIssuedAt();
    }

    public boolean validateJwtToken(String authToken) { // check token
        try {
            Jwts.parser().verifyWith(key()).build().parseSignedClaims(authToken);
            return true;
        } catch (MalformedJwtException e) { // ko dung jwt (token)
            log.error("Invalid JWT token: {}", e.getMessage());
        } catch (TokenExpiredException e) { // token het han
            log.error("JWT token is expired: {}", e.getMessage());
            throw TokenExpiredException.of("Token", e.getMessage());
        } catch (UnsupportedJwtException e) { // token khong ho tro
            log.error("JWT token is unsupported: {}", e.getMessage());
        } catch (InvalidTokenException e) { // token rong
            log.error("JWT claims string is empty: {}", e.getMessage());
            throw InvalidTokenException.of("Token", e.getMessage());
        } catch (Exception e) {
            log.error("Cannot validate JWT token: {}", e.getMessage());
        }

        return false;
    }

    public Long getUserIdFromJwtToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.get("id", Long.class);
    }

    public Claims getClaimsFromToken(@NotBlank String token) {
        return Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long getSubjectAsLong(String token) {
        return Long.parseLong(
                getClaimsFromToken(token).getSubject()
        );
    }

//    /** Lấy jti (JWT ID) từ token - dùng để tra/đánh dấu trong Redis denylist. */
//    public String getJtiFromToken(String token) {
//        return getClaimsFromToken(token).getId();
//    }
//
//    /** Lấy thời gian còn lại (ms) tới khi token hết hạn - dùng làm TTL khi lưu vào Redis. */
//    public long getRemainingValidityMs(String token) {
//        Date expiration = getClaimsFromToken(token).getExpiration();
//        return Math.max(0, expiration.getTime() - System.currentTimeMillis());
//    }
//
//    private static final String USED_TOKEN_KEY_PREFIX = "auth:token:used:";

    /**
     * Đánh dấu 1 token cụ thể (theo jti) đã được sử dụng - không cho dùng lại.
     * TTL đặt bằng đúng thời gian còn lại của token, để entry tự hết hạn cùng lúc
     * token hết hạn tự nhiên, tránh Redis phình to vô hạn theo thời gian.
     */
//    public void markTokenAsUsed(String jti, long ttlMillis) {
//        if (jti == null || ttlMillis <= 0) {
//            return;
//        }
//        redisTemplate.opsForValue().set(
//                USED_TOKEN_KEY_PREFIX + jti,
//                "1",
//                Duration.ofMillis(ttlMillis));
//    }
//
//    /** Kiểm tra 1 token (theo jti) đã từng được dùng/revoke hay chưa. */
//    public boolean isTokenUsed(String jti) {
//        if (jti == null) {
//            return false;
//        }
//        return Boolean.TRUE.equals(redisTemplate.hasKey(USED_TOKEN_KEY_PREFIX + jti));
//    }
//
//
//// ============================================================================
//// 3. AuthService.setPassword - check + đánh dấu single-use cho set-password token
//// ============================================================================
//
//    @Transactional
//    public void setPassword(SetPasswordRequest request) {
//        if (!request.getPassword().equals(request.getConfirmPassword())) {
//            throw new BadRequestException("Mật khẩu xác nhận không khớp.");
//        }
//
//        if (!jwtUtils.validateJwtToken(request.getToken())) {
//            throw new InvalidTokenException("Liên kết thiết lập mật khẩu không hợp lệ hoặc đã hết hạn.");
//        }
//
//        String jti = jwtUtils.getJtiFromToken(request.getToken());
//        if (tokenService.isTokenUsed(jti)) {
//            throw new InvalidTokenException("Liên kết này đã được sử dụng, vui lòng yêu cầu liên kết mới.");
//        }
//
//        Long userId = jwtUtils.getUserIdFromJwtToken(request.getToken());
//        UserEntity user = userRepository.findById(userId)
//                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng."));
//
//        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
//        user.setStatus(UserStatusEntity.ACTIVE);
//        userRepository.save(user);
//
//        // Đánh dấu token này đã dùng - không cho set lại password bằng link cũ nữa
//        long remainingTtl = jwtUtils.getRemainingValidityMs(request.getToken());
//        tokenService.markTokenAsUsed(jti, remainingTtl);
//
//        auditLogService.log("set_password", "user", user.getId(), null, user);
//    }
//
//
//// ============================================================================
//// 4. AuthService.refreshToken - rotation: mỗi lần refresh, revoke token cũ,
////    cấp token mới. Nếu ai đó dùng lại refresh token cũ (đã bị revoke) -> phát
////    hiện được là có dấu hiệu token bị đánh cắp/dùng lại.
//// ============================================================================
//
//    @Transactional
//    public JwtAuthenticationResponse refreshToken(String refreshToken) {
//        if (!jwtUtils.validateJwtToken(refreshToken)) {
//            throw new InvalidTokenException("Refresh token không hợp lệ hoặc đã hết hạn.");
//        }
//
//        String jti = jwtUtils.getJtiFromToken(refreshToken);
//        if (tokenService.isTokenUsed(jti)) {
//            // Refresh token cũ bị dùng lại - dấu hiệu bị đánh cắp.
//            // Revoke toàn bộ session của user này để an toàn.
//            String username = jwtUtils.getUserNameFromJwtToken(refreshToken);
//            UserEntity user = userRepository.findByUsername(username)
//                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng."));
//            tokenService.invalidateAllSessions(user.getId());
//            throw new InvalidTokenException("Phát hiện refresh token bị sử dụng lại. Vui lòng đăng nhập lại.");
//        }
//
//        // Revoke refresh token cũ ngay sau khi xác nhận hợp lệ (rotation)
//        long remainingTtl = jwtUtils.getRemainingValidityMs(refreshToken);
//        tokenService.markTokenAsUsed(jti, remainingTtl);
//
//        String username = jwtUtils.getUserNameFromJwtToken(refreshToken);
//        CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(username);
//
//        String newAccessToken = jwtUtils.generateJwtToken(
//                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities()));
//        String newRefreshToken = jwtUtils.generateRefreshToken(username);
//
//        return JwtAuthenticationResponse.builder()
//                .accessToken(newAccessToken)
//                .refreshToken(newRefreshToken)
//                .id(userDetails.getUser().getId())
//                .username(userDetails.getUsername())
//                .build();
//    }
}
