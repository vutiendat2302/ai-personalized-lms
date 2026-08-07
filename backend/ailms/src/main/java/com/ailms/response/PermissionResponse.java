package com.ailms.response;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class PermissionResponse {
    private Long id;
    private String name;
    private String code;
    private String entity;
    private String action;
    private String description;
    private LocalDateTime createdAt;
    private Long createdBy;
    private Long updatedBy;
    private LocalDateTime updatedAt;
    private Long roleCount;
}
