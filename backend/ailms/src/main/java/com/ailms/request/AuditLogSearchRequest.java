package com.ailms.request;

import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class AuditLogSearchRequest extends CommonSearchRequest<Void> {

    private Long userId;

    private String entityType;

    private Long entityId;

    private String action;

    private List<String> actions;

    private String ipAddress;

    private String userQuery;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime occurredFrom;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime occurredTo;
}
