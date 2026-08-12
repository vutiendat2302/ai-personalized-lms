package com.ailms.job;

import com.ailms.entity.StudyGoalEntity;
import com.ailms.repository.StudyGoalRepository;
import com.ailms.service.IStudyGoalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Đồng bộ streak của các mục tiêu học tập mỗi ngày từ hoạt động thực tế. */
@Component
@RequiredArgsConstructor
@Slf4j
public class StudentStreakRefreshJob {
    private final StudyGoalRepository studyGoalRepository;
    private final IStudyGoalService studyGoalService;

    /** Đánh giá lại mục tiêu của từng học viên lúc 00:05 mỗi ngày. */
    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Bangkok")
    public void refreshDailyStreaks() {
        studyGoalRepository.findAll().stream().map(StudyGoalEntity::getUserId).distinct().forEach(userId -> {
            try {
                studyGoalService.evaluateUserGoals(userId);
            } catch (RuntimeException exception) {
                log.error("Could not refresh daily streak for user {}", userId, exception);
            }
        });
    }
}
