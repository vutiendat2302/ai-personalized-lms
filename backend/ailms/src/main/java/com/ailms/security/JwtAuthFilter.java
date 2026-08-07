package com.ailms.security;

import com.ailms.exception.TokenExpiredException;
import com.ailms.exception.UsernameNotFoundException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Bộ lọc xác thực JWT của Spring Security.
 *
 * <p>Filter này được thực thi một lần cho mỗi HTTP request nhằm:
 * <ol>
 *     <li>Lấy JWT từ Authorization Header.</li>
 *     <li>Kiểm tra tính hợp lệ của JWT.</li>
 *     <li>Lấy thông tin người dùng từ JWT.</li>
 *     <li>Tải thông tin người dùng từ cơ sở dữ liệu.</li>
 *     <li>Tạo {@link UsernamePasswordAuthenticationToken}.</li>
 *     <li>Lưu thông tin xác thực vào {@link SecurityContextHolder}.</li>
 * </ol>
 *
 * <p>Sau khi xác thực thành công, Spring Security sẽ sử dụng thông tin
 * trong {@link SecurityContextHolder} để thực hiện phân quyền cho các
 * request tiếp theo.
 */

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    /**
     * Tiện ích xử lý JWT (tạo, xác thực và trích xuất thông tin từ token).
     */
    private final JwtUtils jwtUtils;
    /**
     * Service dùng để tải thông tin người dùng từ cơ sở dữ liệu.
     */
    private final CustomUserDetailsService userDetailsService;
    /**
     * Thao tác với Redis để kiểm tra token có bị vô hiệu hóa không.
     */
    private final RedisTemplate<String, String> redisTemplate;

    /**
     * Xử lý xác thực JWT cho mỗi HTTP request.
     *
     * <p>Nếu JWT hợp lệ, phương thức sẽ tạo đối tượng Authentication
     * và lưu vào SecurityContext để Spring Security nhận biết người dùng
     * đã được xác thực.
     *
     * @param request HTTP request hiện tại.
     * @param response HTTP response hiện tại.
     * @param filterChain Chuỗi các filter tiếp theo.
     */
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // Lấy JWT từ Authorization Header
            String jwt = parseJwt(request);
            if (jwt != null && !jwtUtils.validateJwtToken(jwt)) {
                SecurityContextHolder.clearContext();
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Access token không hợp lệ");
                return;
            }

            if (jwt != null) {
                // Tải thông tin người dùng từ cơ sở dữ liệu
                String username = jwtUtils.getUserNameFromJwtToken(jwt);

                // Tạo Authentication chứa thông tin người dùng và quyền hạn
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                // Kiểm tra token có bị vô hiệu hóa do đổi mật khẩu không
                Long userId = ((CustomUserDetails) userDetails).getUser().getId();
                String invalidateKey = "invalidate:token:user:" + userId;
                String invalidateTimeStr = redisTemplate.opsForValue().get(invalidateKey);
                
                boolean isValid = true;
                if (invalidateTimeStr != null) {
                    long invalidateTime = Long.parseLong(invalidateTimeStr);
                    java.util.Date issuedAt = jwtUtils.getIssuedAtFromJwtToken(jwt);
                    // Nếu token được phát hành trước khi đổi mật khẩu (hoặc lúc đó)
                    if (issuedAt != null && issuedAt.getTime() <= invalidateTime) {
                        isValid = false;
                        log.warn("Token đã bị vô hiệu hóa cho user {}", username);
                    }
                }

                if (isValid) {
                    // Tạo Authentication chứa thông tin người dùng và quyền hạn
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities());
                    // Gắn thêm thông tin chi tiết của request (IP, Session, ...)
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // Lưu Authentication vào SecurityContext
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } else {
                    SecurityContextHolder.clearContext();
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Access token đã bị vô hiệu hóa");
                    return;
                }
            }
        } catch (UsernameNotFoundException e) {
            log.warn("User not found during JWT authentication: {}", e.getMessage());
            SecurityContextHolder.clearContext();
        } catch (TokenExpiredException e) {
            log.warn("JWT token expired: {}", e.getMessage());
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Access token đã hết hạn");
            return;
        } catch (Exception ex) {
            log.error("Cannot set user authentication: {}", ex.getMessage());
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Trích xuất JWT từ Authorization Header.
     *
     * <p>Header hợp lệ có định dạng:
     * <pre>
     * Authorization: Bearer eyJhbGc...
     * </pre>
     *
     * @param request HTTP request hiện tại.
     * @return JWT nếu tồn tại và đúng định dạng, ngược lại trả về {@code null}.
     */
    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        return null;
    }
}
