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
                .claim("id", userId)
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
}
