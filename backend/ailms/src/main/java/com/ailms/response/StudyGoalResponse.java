package com.ailms.response;

import com.ailms.entity.enums.StudyGoalStatusEnum;
import com.ailms.entity.enums.StudyGoalTypeEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudyGoalResponse {

    private Long id;

    private Long userId;

    private StudyGoalTypeEnum studyGoalTypeEnum;

    private Integer targetValue;

    private Long courseId;

    private Integer currentStreak;

    private Integer longestStreak;

    private StudyGoalStatusEnum status;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
