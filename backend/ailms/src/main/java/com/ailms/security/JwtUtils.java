package com.ailms.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
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

    @Value("${app.jwt.secret}") // HS256
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private int jwtExpirationMs;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
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
                .signWith(key(), Jwts.SIG.HS256)
                .compact();
    }

    public String getUserNameFromJwtToken(String token) {
        return Jwts.parser().verifyWith(key()).build()
                .parseSignedClaims(token).getPayload().getSubject();
    }

    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parser().verifyWith(key()).build().parseSignedClaims(authToken);
            return true;
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
        }

        return false;
    }
}
