package com.ailms.service.calculator;

import com.ailms.dto.GoalProgress;
import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.entity.LessonProgressEntity;
import com.ailms.entity.StudyGoalEntity;
import com.ailms.entity.enums.StudyGoalTypeEnum;
import com.ailms.repository.LearningActivityLogRepository;
import com.ailms.repository.LessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class CourseCompletionCalculator implements StudyGoalProgressCalculator {

    private final LearningActivityLogRepository learningActivityLogRepository;
    private final LessonProgressRepository lessonProgressRepository;

    @Override
    public StudyGoalTypeEnum getType() {
        return StudyGoalTypeEnum.COURSE_COMPLETION;
    }

    @Override
    public GoalProgress calculateProgress(StudyGoalEntity goal, LocalDateTime asOfDate) {
        log.info("Calculating COURSE_COMPLETION progress for user: {}, courseId: {}", goal.getUserId(), goal.getCourseId());

        List<LessonProgressEntity> lessonProgresses = lessonProgressRepository.findByUserId(goal.getUserId());
        long completedLessonsCount = lessonProgresses.stream()
                .filter(lp -> lp.getCompletedAt() != null || (lp.getProgressPercent() != null && lp.getProgressPercent() >= 100))
                .count();

        if (completedLessonsCount == 0) {
            List<LearningActivityLogEntity> logs = learningActivityLogRepository.findByUserId(goal.getUserId());
            completedLessonsCount = logs.stream()
                    .filter(l -> "LESSON_COMPLETE".equalsIgnoreCase(l.getEventType()) || "COURSE_COMPLETE".equalsIgnoreCase(l.getEventType()))
                    .count();
        }

        int targetValue = goal.getTargetValue() != null ? goal.getTargetValue() : 100;
        boolean isAchieved = completedLessonsCount >= targetValue;

        return GoalProgress.builder()
                .currentValue((int) completedLessonsCount)
                .targetValue(targetValue)
                .isAchieved(isAchieved)
                .currentStreak(goal.getCurrentStreak() != null ? goal.getCurrentStreak() : 0)
                .longestStreak(goal.getLongestStreak() != null ? goal.getLongestStreak() : 0)
                .build();
    }
}
