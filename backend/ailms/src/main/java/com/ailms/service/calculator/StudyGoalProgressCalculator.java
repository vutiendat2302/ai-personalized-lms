package com.ailms.service.calculator;

import com.ailms.dto.GoalProgress;
import com.ailms.entity.StudyGoalEntity;
import com.ailms.entity.enums.StudyGoalTypeEnum;

import java.time.LocalDateTime;

public interface StudyGoalProgressCalculator {
    
    StudyGoalTypeEnum getType();

    GoalProgress calculateProgress(StudyGoalEntity goal, LocalDateTime asOfDate);
}
