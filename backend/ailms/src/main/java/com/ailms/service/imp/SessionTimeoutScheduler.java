package com.ailms.service.imp;

import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.entity.LearningSessionEntity;
import com.ailms.entity.enums.SessionStatusEnum;
import com.ailms.repository.LearningActivityLogRepository;
import com.ailms.repository.LearningSessionRepository;
import com.ailms.service.IStudyGoalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class SessionTimeoutScheduler {

    private final LearningSessionRepository learningSessionRepository;
    private final LearningActivityLogRepository learningActivityLogRepository;
    private final IStudyGoalService studyGoalService;

    /**
     * Runs every 30 seconds to auto-close active sessions where last_heartbeat_at is older than 90 seconds.
     */
    @Scheduled(fixedDelay = 30000)
    @Transactional
    public void cleanupStaleSessions() {
        LocalDateTime threshold = LocalDateTime.now().minusSeconds(90);

        List<LearningSessionEntity> staleSessions = learningSessionRepository.findStaleActiveSessions(SessionStatusEnum.ACTIVE, threshold);
        if (staleSessions.isEmpty()) {
            return;
        }

        log.info("Found {} stale learning sessions (> 90s without heartbeat). Closing...", staleSessions.size());

        for (LearningSessionEntity session : staleSessions) {
            session.setStatus(SessionStatusEnum.HEARTBEAT_TIMEOUT);
            session.setCloseReason("HEARTBEAT_TIMEOUT: Exceeded 90s without heartbeat");
            learningSessionRepository.save(session);

            String jsonMetadata = "{\"duration_seconds\":" + session.getActiveSeconds() + ",\"close_reason\":\"HEARTBEAT_TIMEOUT\"}";
            LearningActivityLogEntity logEntry = LearningActivityLogEntity.builder()
                    .userId(session.getUserId())
                    .eventType("LEARNING_SESSION_END")
                    .entityType(session.getEntityType())
                    .entityId(session.getEntityId())
                    .metadata(jsonMetadata)
                    .occurredAt(LocalDateTime.now())
                    .build();

            learningActivityLogRepository.save(logEntry);

            try {
                studyGoalService.evaluateUserGoals(session.getUserId());
            } catch (Exception e) {
                log.error("Failed to re-evaluate goals for user: {}", session.getUserId(), e);
            }
        }
    }
}
