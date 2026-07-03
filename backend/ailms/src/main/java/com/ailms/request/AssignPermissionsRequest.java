package com.ailms.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;

@Data
public class AssignPermissionsRequest {
    @NotEmpty(message = "Permission IDs list cannot be empty")
    private List<Long> permissionIds;
}
