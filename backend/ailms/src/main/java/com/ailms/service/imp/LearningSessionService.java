package com.ailms.service.imp;

import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.entity.LearningSessionEntity;
import com.ailms.entity.enums.SessionStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.LearningSessionMapper;
import com.ailms.repository.LearningActivityLogRepository;
import com.ailms.repository.LearningSessionRepository;
import com.ailms.request.HeartbeatRequest;
import com.ailms.response.LearningSessionResponse;
import com.ailms.service.ILearningSessionService;
import com.ailms.service.IStudyGoalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LearningSessionService implements ILearningSessionService {

    private final LearningSessionRepository learningSessionRepository;
    private final LearningActivityLogRepository learningActivityLogRepository;
    private final LearningSessionMapper learningSessionMapper;
    private final IStudyGoalService studyGoalService;
    private final ApplicationEventPublisher applicationEventPublisher;

    private static final String RESOURCE_NAME = "LearningSession";
    private static final int IDLE_TIMEOUT_MINUTES = 12;

    @Transactional
    @Override
    public LearningSessionResponse startSession(Long userId, String entityType, Long entityId) {
        log.info("Starting new learning session for user: {}, entityType: {}, entityId: {}", userId, entityType, entityId);

        // Auto-close any previous active sessions for the user
        List<LearningSessionEntity> activeSessions = learningSessionRepository.findByUserIdAndStatus(userId, SessionStatusEnum.ACTIVE);
        for (LearningSessionEntity s : activeSessions) {
            closeSessionInternal(s, SessionStatusEnum.CLOSED, "New session started");
        }

        LocalDateTime now = LocalDateTime.now();
        LearningSessionEntity session = LearningSessionEntity.builder()
                .userId(userId)
                .entityType(entityType)
                .entityId(entityId)
                .activeSeconds(0)
                .status(SessionStatusEnum.ACTIVE)
                .lastHeartbeatAt(now)
                .lastInteractionAt(now)
                .build();

        LearningSessionEntity saved = learningSessionRepository.save(session);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "START_SESSION", "LEARNING_SESSION", saved.getId(), null, saved));
        return learningSessionMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public LearningSessionResponse heartbeat(Long sessionId, HeartbeatRequest request) {
        log.info("Processing heartbeat for session: {}", sessionId);

        LearningSessionEntity session = learningSessionRepository.findById(sessionId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, sessionId));

        if (session.getStatus() != SessionStatusEnum.ACTIVE) {
            log.warn("Heartbeat received for non-active session: {}", sessionId);
            return learningSessionMapper.toResponse(session);
        }

        LocalDateTime now = LocalDateTime.now();

        if (request.isUserInteractionOccurred()) {
            session.setLastInteractionAt(now);
        }

        // Check idle timeout (> 12 minutes without user interaction)
        if (session.getLastInteractionAt() != null) {
            long idleMinutes = Duration.between(session.getLastInteractionAt(), now).toMinutes();
            if (idleMinutes >= IDLE_TIMEOUT_MINUTES) {
                log.info("Session {} timed out due to idle user (> 12 mins without interaction).", sessionId);
                closeSessionInternal(session, SessionStatusEnum.IDLE_TIMEOUT, "IDLE_TIMEOUT: No user interaction for > 12 minutes");
                return learningSessionMapper.toResponse(session);
            }
        }

        int increment = request.getActiveSecondsIncrement() > 0 ? request.getActiveSecondsIncrement() : 30;
        session.setActiveSeconds(session.getActiveSeconds() + increment);
        session.setLastHeartbeatAt(now);

        LearningSessionEntity saved = learningSessionRepository.save(session);
        return learningSessionMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public LearningSessionResponse endSession(Long sessionId, String closeReason) {
        log.info("Ending session: {}, reason: {}", sessionId, closeReason);

        LearningSessionEntity session = learningSessionRepository.findById(sessionId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, sessionId));

        if (session.getStatus() != SessionStatusEnum.ACTIVE) {
            return learningSessionMapper.toResponse(session);
        }

        SessionStatusEnum status = "BEACON".equalsIgnoreCase(closeReason) ? SessionStatusEnum.BEACON_CLOSED : SessionStatusEnum.CLOSED;
        closeSessionInternal(session, status, closeReason != null ? closeReason : "User closed session");

        return learningSessionMapper.toResponse(session);
    }

    @Override
    public LearningSessionResponse getById(Long id) {
        LearningSessionEntity entity = learningSessionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return learningSessionMapper.toResponse(entity);
    }

    @Override
    public List<LearningSessionResponse> getActiveSessionsForUser(Long userId) {
        return learningSessionMapper.toResponseList(learningSessionRepository.findByUserIdAndStatus(userId, SessionStatusEnum.ACTIVE));
    }

    private void closeSessionInternal(LearningSessionEntity session, SessionStatusEnum finalStatus, String reason) {
        session.setStatus(finalStatus);
        session.setCloseReason(reason);
        learningSessionRepository.save(session);

        // Append summary event to learning_activity_log
        String jsonMetadata = "{\"duration_seconds\":" + session.getActiveSeconds() + ",\"close_reason\":\"" + (reason != null ? reason : "") + "\"}";
        LearningActivityLogEntity logEntry = LearningActivityLogEntity.builder()
                .userId(session.getUserId())
                .eventType("LEARNING_SESSION_END")
                .entityType(session.getEntityType())
                .entityId(session.getEntityId())
                .metadata(jsonMetadata)
                .occurredAt(LocalDateTime.now())
                .build();

        learningActivityLogRepository.save(logEntry);

        // Async re-evaluate study goals & streaks
        final Long userId = session.getUserId();
        CompletableFuture.runAsync(() -> {
            try {
                studyGoalService.evaluateUserGoals(userId);
            } catch (Exception e) {
                log.error("Async study goal evaluation failed for user: {}", userId, e);
            }
        });

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "END_SESSION", "LEARNING_SESSION", session.getId(), null, session));
    }
}
