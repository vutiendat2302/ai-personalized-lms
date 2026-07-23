package com.ailms.service.imp;

import com.ailms.service.ICourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class CourseMetricScheduler {

    private final ICourseService courseService;

    /**
     * Runs daily at 1:00 AM to update trending scores and sync enrollment metrics.
     */
    @Scheduled(cron = "0 0 1 * * *")
    public void updateCourseMetrics() {
        log.info("Scheduled task: Recalculating course metrics and trending scores");
        try {
            courseService.recalculateTrendingScores();
            log.info("Scheduled task completed: Recalculated course metrics successfully");
        } catch (Exception e) {
            log.error("Error occurred while recalculating course metrics in scheduler", e);
        }
    }
}
