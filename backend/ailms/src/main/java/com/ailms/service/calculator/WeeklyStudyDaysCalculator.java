package com.ailms.service.calculator;

import com.ailms.dto.GoalProgress;
import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.entity.StudyGoalEntity;
import com.ailms.entity.enums.StudyGoalTypeEnum;
import com.ailms.repository.LearningActivityLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@Slf4j
@RequiredArgsConstructor
public class WeeklyStudyDaysCalculator implements StudyGoalProgressCalculator {

    private final LearningActivityLogRepository learningActivityLogRepository;

    @Override
    public StudyGoalTypeEnum getType() {
        return StudyGoalTypeEnum.WEEKLY_STUDY_DAYS;
    }

    @Override
    public GoalProgress calculateProgress(StudyGoalEntity goal, LocalDateTime asOfDate) {
        log.info("Calculating WEEKLY_STUDY_DAYS progress for user: {}", goal.getUserId());

        LocalDate today = asOfDate != null ? asOfDate.toLocalDate() : LocalDate.now();
        LocalDate startOfWeek = today.with(DayOfWeek.MONDAY);
        LocalDate endOfWeek = today.with(DayOfWeek.SUNDAY);

        List<LearningActivityLogEntity> logs = learningActivityLogRepository.findByUserId(goal.getUserId());

        Set<LocalDate> activeDaysThisWeek = logs.stream()
                .filter(l -> l.getOccurredAt() != null)
                .map(l -> l.getOccurredAt().toLocalDate())
                .filter(d -> !d.isBefore(startOfWeek) && !d.isAfter(endOfWeek))
                .collect(Collectors.toSet());

        int currentDaysCount = activeDaysThisWeek.size();
        int targetValue = goal.getTargetValue() != null ? goal.getTargetValue() : 5;
        boolean isAchieved = currentDaysCount >= targetValue;

        return GoalProgress.builder()
                .currentValue(currentDaysCount)
                .targetValue(targetValue)
                .isAchieved(isAchieved)
                .currentStreak(goal.getCurrentStreak() != null ? goal.getCurrentStreak() : 0)
                .longestStreak(goal.getLongestStreak() != null ? goal.getLongestStreak() : 0)
                .build();
    }
}
