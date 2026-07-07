package com.ailms.response;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RoleResponse {
    private Long id;
    private String name;
    private String code;
    private String description;
    private Boolean isSystem;
    private LocalDateTime createdAt;
    private Long createdBy;
    private Long updatedBy;
    private LocalDateTime updatedAt;
}
