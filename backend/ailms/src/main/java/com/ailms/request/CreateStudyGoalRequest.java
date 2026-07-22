package com.ailms.request;

import com.ailms.entity.enums.StudyGoalTypeEnum;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateStudyGoalRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    private StudyGoalTypeEnum studyGoalTypeEnum;

    private Integer targetValue;

    private Long courseId;

    private Integer currentStreak;

    private Integer longestStreak;
}
