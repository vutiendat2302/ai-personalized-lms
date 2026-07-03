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

@Configuration
@EnableWebSecurity // Bật spring security
@EnableMethodSecurity // Cho phép dùng PerAuthorize hasRole('ADMIN')
@RequiredArgsConstructor
public class SecurityConfig {

    /**
     * Client
     *    │
     *    │ POST /login
     *    ▼
     * AuthenticationManager
     *    │
     *    ▼
     * DaoAuthenticationProvider
     *    │
     *    ▼
     * CustomUserDetailsService
     *    │
     *    ▼
     * Database
     *    │
     *    ▼
     * JWT
     * Sau khi client co jwt
     * Client
     *    │
     *    │ Authorization: Bearer xxx
     *    ▼
     * JwtAuthFilter
     *    │
     *    ▼
     * SecurityContext
     *    │
     *    ▼
     * Controller
     */

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthFilter jwtAuthFilter;

    @Value("${api.auth-prefix}")
    private String authPrefix;

    @Bean
    public DaoAuthenticationProvider authenticationProvider() { // xác thực username / password
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder()); // use Bcrypt
        return authProvider;
    }

    @Bean // Login
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable) // Tắt csrf token, chỉ xác thực khi đăng nhập
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> 
                        auth.requestMatchers(authPrefix + "/**").permitAll()
                            .anyRequest().authenticated()
                );

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
