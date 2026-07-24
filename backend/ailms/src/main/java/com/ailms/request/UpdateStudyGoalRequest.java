package com.ailms.request;

import com.ailms.entity.enums.StudyGoalStatusEnum;
import com.ailms.entity.enums.StudyGoalTypeEnum;
import jdk.jfr.DataAmount;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateStudyGoalRequest {

    private StudyGoalTypeEnum studyGoalTypeEnum;

    private Integer targetValue;

    private Long courseId;

    private Integer currentStreak;

    private Integer longestStreak;

    private StudyGoalStatusEnum status;
}
