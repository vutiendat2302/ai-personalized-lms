package com.ailms.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;

@Data
public class AssignRolesRequest {
    @NotEmpty(message = "Role IDs list cannot be empty")
    private List<Long> roleIds;
}
