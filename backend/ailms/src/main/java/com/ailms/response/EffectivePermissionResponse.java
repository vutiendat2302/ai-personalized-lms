package com.ailms.response;

import lombok.Data;
import java.util.List;

@Data
public class EffectivePermissionResponse {
    private Long permissionId;
    private String permissionName;
    private String permissionCode;
    private String entity;
    private String action;
    private String description;
    private List<String> sourceRoles;
}
