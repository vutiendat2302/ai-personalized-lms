package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAttemptRequest {

    @NotNull(message = "Quiz ID is required")
    private Long quizId;

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotNull(message = "Enrollment ID is required")
    private Long enrollmentId;

    private Integer attemptNumber;

    private BigDecimal score;

    private Boolean isPassed;

    private Byte status;

    private LocalDateTime startedAt;

    private LocalDateTime submittedAt;

    private Integer timeSpentSec;
}
