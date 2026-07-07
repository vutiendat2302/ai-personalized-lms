package com.ailms.config;

import com.ailms.security.CustomUserDetailsService;
import com.ailms.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

/**
 * Cấu hình Spring Security cho hệ thống.
 *
 * <p>Thiết lập cơ chế xác thực bằng JWT, cấu hình AuthenticationProvider,
 * PasswordEncoder, SecurityFilterChain và chính sách CORS.
 *
 * <p>Luồng xác thực:
 * <pre>
 * Login:
 * Client
 *     │
 *     ▼
 * AuthenticationManager
 *     │
 *     ▼
 * DaoAuthenticationProvider
 *     │
 *     ▼
 * CustomUserDetailsService
 *     │
 *     ▼
 * Database
 *     │
 *     ▼
 * JWT
 *
 * Sau khi đăng nhập:
 *
 * Client
 *     │ Authorization: Bearer {JWT}
 *     ▼
 * JwtAuthFilter
 *     │
 *     ▼
 * SecurityContextHolder
 *     │
 *     ▼
 * Controller
 * </pre>
 */
@Configuration
@EnableWebSecurity // Bật spring security
@EnableMethodSecurity // Cho phép dùng PerAuthorize hasRole('ADMIN')
@RequiredArgsConstructor
public class SecurityConfig {

    /**
     * Service tải thông tin người dùng phục vụ xác thực.
     */
    private final CustomUserDetailsService userDetailsService;

    /**
     * Filter xác thực JWT cho mỗi HTTP request.
     */
    private final JwtAuthFilter jwtAuthFilter;

    /**
     * Tiền tố của các API xác thực (ví dụ: /api/auth).
     */
    @Value("${api.auth-prefix}")
    private String authPrefix;

    @Value("${app.frontend.url}")
    private List<String> frontendUrls;

    /**
     * Cấu hình AuthenticationProvider sử dụng UserDetailsService
     * và PasswordEncoder để xác thực username/password.
     *
     * @return DaoAuthenticationProvider.
     */
    @Bean
    public DaoAuthenticationProvider authenticationProvider() { // xác thực username / password
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder()); // use Bcrypt
        return authProvider;
    }

    /**
     * Cung cấp AuthenticationManager cho quá trình xác thực.
     *
     * @param authConfig Cấu hình Authentication của Spring Security.
     * @return AuthenticationManager.
     * @throws Exception Nếu không thể khởi tạo AuthenticationManager.
     */
    @Bean // Login
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    /**
     * PasswordEncoder sử dụng thuật toán BCrypt
     * để mã hóa và kiểm tra mật khẩu.
     *
     * @return BCryptPasswordEncoder.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Cấu hình chuỗi filter của Spring Security.
     *
     * <p>Cấu hình bao gồm:
     * <ul>
     *     <li>Bật CORS.</li>
     *     <li>Tắt CSRF (do sử dụng JWT).</li>
     *     <li>Sử dụng Stateless Session.</li>
     *     <li>Cho phép truy cập các API xác thực.</li>
     *     <li>Yêu cầu xác thực đối với các API còn lại.</li>
     *     <li>Đăng ký JwtAuthFilter.</li>
     * </ul>
     *
     * @param http Đối tượng HttpSecurity.
     * @return SecurityFilterChain.
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        // Cấu hình CORS
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable) // Không sử dụng CSRF do xác thực bằng JWT
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))// Không tạo HTTP Session
                .authorizeHttpRequests(auth -> auth.requestMatchers(authPrefix + "/**").permitAll() // Cho phép truy cập các API Authentication, các API khác yêu cầu đăng nhập
                        .anyRequest().authenticated());

        http.authenticationProvider(authenticationProvider()); // Đăng ký AuthenticationProvider
        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class); // Thực thi JwtAuthFilter trước UsernamePasswordAuthenticationFilter

        return http.build();
    }

    /**
     * Cấu hình Cross-Origin Resource Sharing (CORS).
     *
     * <p>Cho phép frontend truy cập API từ domain được chỉ định.
     *
     * @return Cấu hình CORS.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(frontendUrls);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
