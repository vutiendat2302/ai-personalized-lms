package com.ailms.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;
import java.util.Set;

@Data
public class AssignPermissionsRequest {
    @NotEmpty(message = "Permission IDs list cannot be empty")
    private Set<Long> permissionIds;
}
