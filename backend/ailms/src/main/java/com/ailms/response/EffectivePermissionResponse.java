package com.ailms.response;

import lombok.Data;
import java.util.List;

/**
 * Response chứa danh sách quyền hiệu lực (effective permissions)
 * của một user sau khi tổng hợp từ tất cả các role đang được gán.
*/
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
