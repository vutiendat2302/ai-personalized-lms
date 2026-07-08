package com.ailms.service;

import com.ailms.entity.AuditLogEntity;
import com.ailms.entity.UserEntity;
import com.ailms.repository.AuditLogRepository;
import com.ailms.repository.UserRepository;
import com.ailms.security.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final HttpServletRequest request;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action, String entityType, Long entityId, Object oldValue, Object newValue) {
        try {
            AuditLogEntity auditLog = new AuditLogEntity();
            auditLog.setAction(action);
            auditLog.setEntityType(entityType);
            auditLog.setEntityId(entityId);
            auditLog.setOccurredAt(LocalDateTime.now());

            // Set current user if logged in
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
                UserEntity currentUser = userRepository.findById(userDetails.getUser().getId()).orElse(null);
                auditLog.setUser(currentUser);
            }

            // Set IP and User Agent
            if (RequestContextHolder.getRequestAttributes() != null) {
                String ip = request.getHeader("X-Forwarded-For");
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getRemoteAddr();
                }
                auditLog.setIpAddress(ip);
                auditLog.setUserAgent(request.getHeader("User-Agent"));
            }
//
//            // Serialize old and new values
//            if (oldValue != null) {
//                auditLog.setOldValue(objectMapper.writeValueAsString(oldValue));
//            }
//            if (newValue != null) {
//                auditLog.setNewValue(objectMapper.writeValueAsString(newValue));
//            }

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to save audit log: {}", e.getMessage(), e);
        }
    }
}
