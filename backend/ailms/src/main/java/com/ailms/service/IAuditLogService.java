package com.ailms.service;

import com.ailms.response.AuditLogResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface IAuditLogService {

    // create auditlog
    void log(String action, String entityType, Long entityId, Object oldValue, Object newValue);

    AuditLogResponse getByLogId(Long logId);

    Page<AuditLogResponse> getAuditLogs(
            String entityType,
            Long entityId,
            String action,
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable);

    List<AuditLogResponse> getAllAuditLogs();

    List<AuditLogResponse> getAuditLogsByUserId(Long userId);
}
