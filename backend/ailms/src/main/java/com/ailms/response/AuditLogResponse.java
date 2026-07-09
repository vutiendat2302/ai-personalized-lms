package com.ailms.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AuditLogResponse {
    private Long id;
    private Long userId;
    private String userEmail;
    private String userFullName;
    private String action;
    private String entityType;
    private Long entityId;
    private String oldValue;
    private String newValue;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime occurredAt;
}
