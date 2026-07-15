package com.ailms.service.imp;
import com.ailms.service.IAuditLogService;


import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.entity.AuditLogEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.AuditLogMapper;
import com.ailms.repository.AuditLogRepository;
import com.ailms.repository.UserRepository;
import com.ailms.repository.specification.AuditLogSpecification;
import com.ailms.request.AuditLogSearchRequest;
import com.ailms.response.AuditLogResponse;
import com.ailms.security.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService implements IAuditLogService{

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final HttpServletRequest request;
    private final AuditLogMapper auditLogMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Override
    public void log(String action, String entityType, Long entityId, Object oldValue, Object newValue) {
        Long actorId = getCurrentUserIdFromSecurityContext();
        try {
            AuditLogEntity auditLog = new AuditLogEntity();
            auditLog.setAction(action);
            auditLog.setEntityType(entityType);
            auditLog.setEntityId(entityId);
            auditLog.setOccurredAt(LocalDateTime.now());

            if (actorId != null) {
                userRepository.findById(actorId).ifPresent(auditLog::setUser);
            }

            enrichRequestMetadata(auditLog);
            serializeChanges(auditLog, oldValue, newValue);

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to save audit log: {}", e.getMessage(), e);
        }
    }

    private Long getCurrentUserIdFromSecurityContext() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getUser().getId();
        }
        return null;
    }

    private void enrichRequestMetadata(AuditLogEntity auditLog) {
        if (RequestContextHolder.getRequestAttributes() == null) {
            return;
        }
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        auditLog.setIpAddress(ip);
        auditLog.setUserAgent(request.getHeader("User-Agent"));
    }

    private void serializeChanges(AuditLogEntity auditLog, Object oldValue, Object newValue) {
        if (oldValue != null) {
            auditLog.setOldValue(safeWriteValueAsString(oldValue));
        }
        if (newValue != null) {
            auditLog.setNewValue(safeWriteValueAsString(newValue));
        }
    }

    private String safeWriteValueAsString(Object value) {
        try {
            return SimpleJsonWriter.toJson(value);
        } catch (Exception e) {
            log.warn("Failed to serialize audit log value: {}", e.getMessage());
            return null;
        }
    }

    @Transactional(readOnly = true)
    @Override
    public AuditLogResponse getByLogId(Long id) {
        AuditLogEntity entity = auditLogRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("AuditLog", id));
        return auditLogMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    @Override
    public Page<AuditLogResponse> getAuditLogs(AuditLogSearchRequest request) {
        Specification<AuditLogEntity> spec = AuditLogSpecification.filterAndSearch(request);
        return auditLogRepository.findAll(spec, request.toPageable()).map(auditLogMapper::toResponse);
    }

    @Override
    public List<AuditLogResponse> getAllAuditLogs() {
        return auditLogRepository.findAll().stream().map(auditLogMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    @Override
    public Page<AuditLogResponse> getAuditLogsByUserId(Long userId, AuditLogSearchRequest request) {
        if (!userRepository.existsById(userId)) {
            throw ResourceNotFoundException.of("User", userId);
        }
        if (request == null) {
            request = new AuditLogSearchRequest();
        }
        request.setUserId(userId);
        return getAuditLogs(request);
    }
}
