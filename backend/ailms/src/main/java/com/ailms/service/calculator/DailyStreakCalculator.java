package com.ailms.service.calculator;

import com.ailms.dto.GoalProgress;
import com.ailms.entity.StudyGoalEntity;
import com.ailms.entity.enums.StudyGoalTypeEnum;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@Slf4j
@RequiredArgsConstructor
public class DailyStreakCalculator implements StudyGoalProgressCalculator {

    private final LearningStreakCalculator learningStreakCalculator;

    @Override
    public StudyGoalTypeEnum getType() {
        return StudyGoalTypeEnum.DAILY_STREAK;
    }

    @Override
    public GoalProgress calculateProgress(StudyGoalEntity goal, LocalDateTime asOfDate) {
        log.info("Calculating DAILY_STREAK progress for user: {}", goal.getUserId());

        LearningStreakCalculator.StreakResult streak = learningStreakCalculator.calculate(
                goal.getUserId(), asOfDate != null ? asOfDate.toLocalDate() : null);
        int currentStreak = streak.currentStreak();

        int targetValue = goal.getTargetValue() != null ? goal.getTargetValue() : 7;
        int longestStreak = streak.longestStreak();
        boolean isAchieved = currentStreak >= targetValue;

        return GoalProgress.builder()
                .currentValue(currentStreak)
                .targetValue(targetValue)
                .isAchieved(isAchieved)
                .currentStreak(currentStreak)
                .longestStreak(longestStreak)
                .build();
    }
}
