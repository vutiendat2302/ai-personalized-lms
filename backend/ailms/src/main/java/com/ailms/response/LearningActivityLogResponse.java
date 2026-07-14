package com.ailms.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearningActivityLogResponse {

    private Long id;

    private Long userId;

    private String eventType;

    private String entityType;

    private Long entityId;

    private String metadata;

    private String device;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime occurredAt;
}
