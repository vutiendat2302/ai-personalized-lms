package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PermissionRequest {
    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Code is required")
    private String code;

    @NotBlank(message = "Entity is required")
    private String entity;

    @NotBlank(message = "Action is required")
    private String action;

    private String description;
}
