package com.ailms.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;
import java.util.Set;

@Data
public class AssignPermissionsRequest {
    private Set<Long> permissionIds;
}
