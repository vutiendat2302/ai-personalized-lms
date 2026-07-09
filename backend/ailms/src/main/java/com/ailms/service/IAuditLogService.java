package com.ailms.service;

import com.ailms.entity.UserEntity;
import com.ailms.security.CustomUserDetails;

public interface IAuditLogService {

    void log(String action, String entityType, Long entityId, Object oldValue, Object newValue);
    void log(String action, String entityType, CustomUserDetails userDetails, Object oldValue, Object newValue);
    void log(String action, String entityType, UserEntity user, Object oldValue, Object newValue);
}
