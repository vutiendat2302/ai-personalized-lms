package com.ailms.service.imp;

import com.ailms.service.IAssessmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class QuizAttemptTimeoutScheduler {

    private final IAssessmentService assessmentService;

    /**
     * Sweep expired IN_PROGRESS quiz attempts every 1 minute (60,000 ms).
     */
    @Scheduled(fixedDelay = 60000)
    public void sweepExpiredQuizAttempts() {
        try {
            assessmentService.sweepExpiredQuizAttempts();
        } catch (Exception e) {
            log.error("Error sweeping expired quiz attempts", e);
        }
    }
}
