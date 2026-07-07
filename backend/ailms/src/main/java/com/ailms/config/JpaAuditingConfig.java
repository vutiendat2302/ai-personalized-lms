package com.ailms.config;

import com.ailms.security.CustomUserDetails;
import lombok.NonNull;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

@Configuration // Khai báo bean và cấu hình cho Spring Container
@EnableJpaAuditing(auditorAwareRef = "auditorAware") // Bật JPA Auditing và chỉ định bean dùng để lấy thông tin người thực hiện thao tác
public class JpaAuditingConfig {

    /**
     * Trả về ID của người dùng đang được xác thực trong Spring Security.
     *
     * <p>Bean này được Spring Data JPA sử dụng để tự động điền các trường
     * được đánh dấu bằng {@code @CreatedBy} và {@code @LastModifiedBy}
     *
     * <p>Nếu không có người dùng đăng nhập hoặc request là anonymous,
     * phương thức sẽ trả về {@link Optional#empty()}.
     *
     * @return Đối tượng {@link AuditorAware} cung cấp ID của người dùng hiện tại.
     */
    @Bean
    public AuditorAware<Long> auditorAware() {
        return new SpringSecurityAuditorAware();
    }

    /**
     * Cung cấp ID của người dùng hiện tại cho JPA Auditing
     * bằng cách lấy thông tin từ Spring Security Context.
     */
    private static class SpringSecurityAuditorAware implements AuditorAware<Long> {

        @NonNull
        @Override
        public Optional<Long> getCurrentAuditor() {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (!isAuthenticatedUser(authentication)) {
                return Optional.empty();
            }

            Object principal = authentication.getPrincipal();

            if (!(principal instanceof CustomUserDetails userDetails)) {
                return Optional.empty();
            }

            return Optional.of(userDetails.getUser().getId());
        }

        /**
         * Kiểm tra đã login thật sự, loại trừ trường hợp
         * chưa authenticate hoặc là anonymous request
         */
        private boolean isAuthenticatedUser(Authentication authentication) {
            return authentication != null
                    && authentication.isAuthenticated()
                    && !(authentication instanceof AnonymousAuthenticationToken);
        }
    }
}
