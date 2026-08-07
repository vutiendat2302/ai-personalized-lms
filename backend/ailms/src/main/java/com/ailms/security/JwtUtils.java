package com.ailms.security;

import com.ailms.exception.TokenExpiredException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
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
     * Luồng đăng nhập cơ bản:
     * 1. Client gửi username và password.
     * 2. Spring Security xác thực và tạo Authentication.
     * 3. JwtUtils sinh access token hoặc refresh token.
     * 4. Client gửi token qua header Authorization: Bearer ...
     * 5. JwtAuthFilter validate token và lấy username từ claims.
     */

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private int jwtExpirationMs;

    private static final int EXPIRATION_PASSWORD_TOKEN = 86400000;

    @Value("${app.jwt.refresh-expiration-ms}")
    private int refreshExpirationMs;

    /**
     * Tạo khóa ký HMAC từ secret dạng Base64 trong cấu hình.
     */
    private SecretKey key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    /**
     * Sinh refresh token để cấp lại access token khi access token hết hạn.
     */
    public String generateRefreshToken(String username) {
        return Jwts.builder()
                .subject(username)
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date())
                .expiration(new Date((new Date()).getTime() + refreshExpirationMs))
                .signWith(key(), Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Sinh access token sau khi người dùng đăng nhập thành công.
     */
    public String generateJwtToken(Authentication authentication) {
        CustomUserDetails userPrincipal = (CustomUserDetails) authentication.getPrincipal();

        String authorities = userPrincipal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.joining(","));

        return Jwts.builder()
                .subject(userPrincipal.getUsername())
                .id(UUID.randomUUID().toString())
                .claim("id", userPrincipal.getUser().getId())
                .claim("authorities", authorities)
                .issuedAt(new Date())
                .expiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key(), Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Sinh token dùng một lần cho luồng thiết lập mật khẩu tài khoản được mời.
     */
    public String generateSetPasswordToken(Long userId) {
        return Jwts.builder()
                .subject(userId.toString())
                .id(UUID.randomUUID().toString())
                .claim("type", "invite")
                .issuedAt(new Date())
                .expiration(new Date((new Date()).getTime() + EXPIRATION_PASSWORD_TOKEN))
                .signWith(key(), Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Lấy username từ subject của JWT.
     */
    public String getUserNameFromJwtToken(String token) {
        return Jwts.parser().verifyWith(key()).build()
                .parseSignedClaims(token).getPayload().getSubject();
    }

    /**
     * Lấy thời điểm token được phát hành.
     */
    public Date getIssuedAtFromJwtToken(String token) {
        return Jwts.parser().verifyWith(key()).build()
                .parseSignedClaims(token).getPayload().getIssuedAt();
    }

    /**
     * Kiểm tra token có hợp lệ, còn hạn và đúng chữ ký hay không.
     */
    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parser().verifyWith(key()).build().parseSignedClaims(authToken);
            return true;
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("JWT token is expired: {}", e.getMessage());
            throw TokenExpiredException.of("Token", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Cannot validate JWT token: {}", e.getMessage());
        }

        return false;
    }

    /**
     * Lấy user id từ claim "id" của access token.
     */
    public Long getUserIdFromJwtToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.get("id", Long.class);
    }

    /**
     * Parse và trả về toàn bộ claims của token.
     */
    public Claims getClaimsFromToken(@NotBlank String token) {
        return Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Parse subject của token sang Long, dùng cho token có subject là user id.
     */
    public Long getSubjectAsLong(String token) {
        return Long.parseLong(getClaimsFromToken(token).getSubject());
    }

    /**
     * Lấy jti (JWT ID) để AuthService đánh dấu token đã dùng trong Redis.
     */
    public String getJtiFromToken(String token) {
        return getClaimsFromToken(token).getId();
    }

    /**
     * Lấy thời gian còn lại của token tính bằng milliseconds.
     */
    public long getRemainingValidityMs(String token) {
        Date expiration = getClaimsFromToken(token).getExpiration();
        return Math.max(0, expiration.getTime() - System.currentTimeMillis());
    }
}
