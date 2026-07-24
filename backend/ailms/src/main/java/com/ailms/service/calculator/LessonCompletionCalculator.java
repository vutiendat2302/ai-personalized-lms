package com.ailms.service.calculator;

import com.ailms.dto.GoalProgress;
import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.entity.StudyGoalEntity;
import com.ailms.entity.enums.StudyGoalTypeEnum;
import com.ailms.repository.LearningActivityLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class LessonCompletionCalculator implements StudyGoalProgressCalculator {

    private final LearningActivityLogRepository learningActivityLogRepository;

    @Override
    public StudyGoalTypeEnum getType() {
        return StudyGoalTypeEnum.LESSON_COMPLETION;
    }

    @Override
    public GoalProgress calculateProgress(StudyGoalEntity goal, LocalDateTime asOfDate) {
        log.info("Calculating LESSON_COMPLETION progress for user: {}", goal.getUserId());

        List<LearningActivityLogEntity> logs = learningActivityLogRepository.findByUserId(goal.getUserId());
        long completedCount = logs.stream()
                .filter(l -> "LESSON_COMPLETE".equalsIgnoreCase(l.getEventType()))
                .count();

        int targetValue = goal.getTargetValue() != null ? goal.getTargetValue() : 10;
        boolean isAchieved = completedCount >= targetValue;

        return GoalProgress.builder()
                .currentValue((int) completedCount)
                .targetValue(targetValue)
                .isAchieved(isAchieved)
                .currentStreak(goal.getCurrentStreak() != null ? goal.getCurrentStreak() : 0)
                .longestStreak(goal.getLongestStreak() != null ? goal.getLongestStreak() : 0)
                .build();
    }
}
