package com.ailms.config;

import com.ailms.security.CustomUserDetails;
import com.ailms.security.CustomUserDetailsService;
import com.ailms.security.JwtUtils;
import com.ailms.service.ISupportChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.security.Principal;
import java.util.List;

/** Cấu hình STOMP realtime và xác thực JWT/visitor token ngay lúc CONNECT. */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class SupportWebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final JwtUtils jwtUtils;
    private final CustomUserDetailsService userDetailsService;
    private final ISupportChatService supportChatService;

    /** Bật broker topic riêng cho từng conversation support. */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
    }

    /** Đăng ký endpoint WebSocket qua Nginx và không cho phép origin ngoài cấu hình CORS. */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/support").setAllowedOriginPatterns("*");
    }

    /** Gắn interceptor xác thực và kiểm tra quyền subscribe/send theo conversation. */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new SupportChannelInterceptor());
    }

    /** Interceptor chống đoán conversation ID trên kênh realtime. */
    private class SupportChannelInterceptor implements ChannelInterceptor {
        /** Xác thực CONNECT và chặn SUBSCRIBE/SEND không thuộc visitor hoặc support hiện tại. */
        @Override
        public Message<?> preSend(Message<?> message, MessageChannel channel) {
            StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
            if (accessor == null) return message;
            if (StompCommand.CONNECT.equals(accessor.getCommand())) authenticate(accessor);
            if (StompCommand.SUBSCRIBE.equals(accessor.getCommand()) || StompCommand.SEND.equals(accessor.getCommand())) {
                if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())
                        && isSupportNotification(accessor.getDestination(), accessor.getUser())) return message;
                Long conversationId = conversationId(accessor.getDestination());
                Principal principal = accessor.getUser();
                if (conversationId == null || !supportChatService.canAccessRealtime(conversationId, principal)) {
                    throw new IllegalArgumentException("Realtime conversation access denied");
                }
            }
            return message;
        }

        /** Chỉ cho tài khoản ADMIN hoặc SUPPORT subscribe kênh thông báo tin nhắn chung. */
        private boolean isSupportNotification(String destination, Principal principal) {
            if (!"/user/queue/support-notifications".equals(destination)
                    || !(principal instanceof Authentication authentication)) {
                return false;
            }
            if (authentication.getAuthorities().stream().noneMatch(item ->
                    "ROLE_ADMIN".equals(item.getAuthority()) || "ROLE_SUPPORT".equals(item.getAuthority()))) {
                throw new IllegalArgumentException("Only ADMIN or SUPPORT can subscribe support notifications");
            }
            return true;
        }

        /** Xác thực ADMIN/SUPPORT bằng JWT hoặc visitor bằng token cấp từ public API. */
        private void authenticate(StompHeaderAccessor accessor) {
            String visitorToken = accessor.getFirstNativeHeader("X-Visitor-Token");
            if (StringUtils.hasText(visitorToken)) {
                String visitorId = supportChatService.resolveVisitorId(visitorToken);
                accessor.setUser(new UsernamePasswordAuthenticationToken("visitor:" + visitorId, null,
                        List.of(new SimpleGrantedAuthority("ROLE_VISITOR"))));
                return;
            }
            String authorization = accessor.getFirstNativeHeader("Authorization");
            if (!StringUtils.hasText(authorization) || !authorization.startsWith("Bearer ")) {
                throw new IllegalArgumentException("Missing realtime authentication");
            }
            String jwt = authorization.substring(7);
            if (!jwtUtils.validateJwtToken(jwt)) throw new IllegalArgumentException("Invalid realtime JWT");
            CustomUserDetails user = (CustomUserDetails) userDetailsService.loadUserByUsername(jwtUtils.getUserNameFromJwtToken(jwt));
            if (user.getAuthorities().stream().noneMatch(item ->
                    "ROLE_ADMIN".equals(item.getAuthority()) || "ROLE_SUPPORT".equals(item.getAuthority()))) {
                throw new IllegalArgumentException("Only ADMIN or SUPPORT can connect support socket");
            }
            accessor.setUser(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        }

        /** Lấy conversation ID từ topic hoặc app destination của chat và typing. */
        private Long conversationId(String destination) {
            if (destination == null) return null;
            String[] parts = destination.split("/");
            if (parts.length < 4 || !"support".equals(parts[2])) return null;
            try { return Long.valueOf(parts[3]); } catch (NumberFormatException exception) { return null; }
        }
    }
}
