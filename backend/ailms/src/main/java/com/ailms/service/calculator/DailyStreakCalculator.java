package com.ailms.service.calculator;

import com.ailms.dto.GoalProgress;
import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.entity.StudyGoalEntity;
import com.ailms.entity.enums.StudyGoalTypeEnum;
import com.ailms.repository.LearningActivityLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@Slf4j
@RequiredArgsConstructor
public class DailyStreakCalculator implements StudyGoalProgressCalculator {

    private final LearningActivityLogRepository learningActivityLogRepository;

    @Override
    public StudyGoalTypeEnum getType() {
        return StudyGoalTypeEnum.DAILY_STREAK;
    }

    @Override
    public GoalProgress calculateProgress(StudyGoalEntity goal, LocalDateTime asOfDate) {
        log.info("Calculating DAILY_STREAK progress for user: {}", goal.getUserId());

        List<LearningActivityLogEntity> logs = learningActivityLogRepository.findByUserId(goal.getUserId());

        Set<LocalDate> activeDates = logs.stream()
                .filter(l -> l.getOccurredAt() != null)
                .map(l -> l.getOccurredAt().toLocalDate())
                .collect(Collectors.toSet());

        LocalDate today = asOfDate != null ? asOfDate.toLocalDate() : LocalDate.now();

        int currentStreak = 0;
        LocalDate checkDate = today;

        // Check if there was activity today or yesterday (grace period)
        if (!activeDates.contains(today) && activeDates.contains(today.minusDays(1))) {
            checkDate = today.minusDays(1);
        }

        while (activeDates.contains(checkDate)) {
            currentStreak++;
            checkDate = checkDate.minusDays(1);
        }

        int targetValue = goal.getTargetValue() != null ? goal.getTargetValue() : 7;
        int previousLongest = goal.getLongestStreak() != null ? goal.getLongestStreak() : 0;
        int longestStreak = Math.max(previousLongest, currentStreak);
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
