package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudyGoalRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    private Byte goalType;

    private Integer targetValue;

    private Long courseId;

    private Integer currentStreak;

    private Integer longestStreak;

    private Byte status;
}
