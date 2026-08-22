package com.ailms.service.calculator;

import com.ailms.dto.GoalProgress;
import com.ailms.entity.StudyGoalEntity;
import com.ailms.entity.enums.StudyGoalTypeEnum;
import com.ailms.repository.LearningSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@Slf4j
@RequiredArgsConstructor
public class StudyHoursCalculator implements StudyGoalProgressCalculator {

    private final LearningSessionRepository learningSessionRepository;

    @Override
    public StudyGoalTypeEnum getType() {
        return StudyGoalTypeEnum.STUDY_HOURS;
    }

    @Override
    public GoalProgress calculateProgress(StudyGoalEntity goal, LocalDateTime asOfDate) {
        log.info("Calculating STUDY_HOURS progress for user: {}", goal.getUserId());

        LocalDateTime start = LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime end = asOfDate != null ? asOfDate : LocalDateTime.now();

        Long totalActiveSeconds = learningSessionRepository.sumActiveSecondsForUserInPeriod(goal.getUserId(), start, end);
        if (totalActiveSeconds == null) {
            totalActiveSeconds = 0L;
        }

        int hoursStudied = (int) (totalActiveSeconds / 3600);
        int targetValue = goal.getTargetValue() != null ? goal.getTargetValue() : 20; // target hours
        boolean isAchieved = hoursStudied >= targetValue;

        return GoalProgress.builder()
                .currentValue(hoursStudied)
                .targetValue(targetValue)
                .isAchieved(isAchieved)
                .currentStreak(goal.getCurrentStreak() != null ? goal.getCurrentStreak() : 0)
                .longestStreak(goal.getLongestStreak() != null ? goal.getLongestStreak() : 0)
                .build();
    }
}
