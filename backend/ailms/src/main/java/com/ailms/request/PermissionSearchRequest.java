package com.ailms.request;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class PermissionSearchRequest extends CommonSearchRequest<Void> {

    private String entity;

    private String action;

    private String assignedStatus;

    @Override
    protected List<String> allowedSortFields() {
        return List.of("id", "name", "code", "entity", "action", "createdAt");
    }
}
