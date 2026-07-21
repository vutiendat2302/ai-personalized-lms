package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateLearningActivityLogRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    private String eventType;

    private String entityType;

    private Long entityId;

    private String metadata;

    private String device;

    private LocalDateTime occurredAt;
}
