package com.ailms.service;

import com.ailms.request.AuditLogSearchRequest;
import com.ailms.response.AuditLogResponse;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;

import java.util.List;

public interface IAuditLogService {

    void log(String action, String entityType, Long entityId, Object oldValue, Object newValue);

    AuditLogResponse getByLogId(Long logId);

    PageResponse<AuditLogResponse> getAuditLogs(AuditLogSearchRequest request);

    List<AuditLogResponse> getAllAuditLogs();

    PageResponse<AuditLogResponse> getAuditLogsByUserId(Long userId, AuditLogSearchRequest request);
}
