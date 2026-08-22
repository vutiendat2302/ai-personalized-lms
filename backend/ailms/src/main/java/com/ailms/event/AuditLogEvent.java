package com.ailms.event;

import lombok.Getter;
import lombok.Setter;
import org.springframework.context.ApplicationEvent;

@Getter
@Setter
public class AuditLogEvent extends ApplicationEvent {

    private final String action;
    private final String entityType;
    private final Long entityId;
    private final Object oldValue;
    private final Object newValue;

    public AuditLogEvent(Object source, String action, String entityType, Long entityId, Object oldValue, Object newValue) {
        super(source);
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
}
