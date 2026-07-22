package com.ailms.response;

import com.ailms.entity.enums.SessionStatusEnum;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearningSessionResponse {

    private Long id;

    private Long userId;

    private String entityType;

    private Long entityId;

    private int activeSeconds;

    private SessionStatusEnum status;

    private String closeReason;

    private LocalDateTime lastHeartbeatAt;

    private LocalDateTime lastInteractionAt;

    private LocalDateTime createdAt;
}
