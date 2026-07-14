package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonProgressRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotNull(message = "Lesson ID is required")
    private Long lessonId;

    @NotNull(message = "Enrollment ID is required")
    private Long enrollmentId;

    private Byte status;

    private Integer progressPercent;

    private Integer lastPositionSec;

    private Integer timeSpentSec;

    private Integer attemptCount;

    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    private LocalDateTime lastAccessedAt;
}
