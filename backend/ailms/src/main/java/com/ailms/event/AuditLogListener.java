package com.ailms.event;

import com.ailms.service.IAuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuditLogListener {

    private final IAuditLogService auditLogService;

    @EventListener
    public void handleAuditLogEvent(AuditLogEvent event) {
        log.debug("Received AuditLogEvent: action={}, entityType={}, entityId={}", 
                event.getAction(), event.getEntityType(), event.getEntityId());
        try {
            auditLogService.log(
                    event.getAction(),
                    event.getEntityType(),
                    event.getEntityId(),
                    event.getOldValue(),
                    event.getNewValue()
            );
        } catch (Exception e) {
            log.error("Failed to process AuditLogEvent", e);
        }
    }
}
