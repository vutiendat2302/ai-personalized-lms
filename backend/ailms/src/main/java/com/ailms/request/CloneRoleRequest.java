package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CloneRoleRequest {

    @NotBlank(message = "New role name is required")
    private String name;

    private String description;
}
