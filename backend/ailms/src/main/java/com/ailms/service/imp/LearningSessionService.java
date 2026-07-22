package com.ailms.service.imp;

import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.entity.LearningSessionEntity;
import com.ailms.entity.enums.SessionStatusEnum;
import com.ailms.event.StudySessionEndedEvent;
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
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;


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
    private final JsonMapper jsonMapper;

    private static final String RESOURCE_NAME = "LearningSession";

    /** Thời gian tối đa không tương tác trước khi timeout (phút). */
    private static final int IDLE_TIMEOUT_MINUTES = 12;

    @Transactional
    @Override
    public LearningSessionResponse startSession(Long userId, String entityType, Long entityId) {
        log.info("Starting new learning session for user: {}, entityType: {}, entityId: {}", userId, entityType, entityId);

        // Tự động đóng phiên học cũ trước khi tạo phiên học mới
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
        return learningSessionMapper.toResponse(saved);
    }

    // xử lý heartbeat từ client.
    @Transactional
    @Override
    public LearningSessionResponse heartbeat(Long sessionId, HeartbeatRequest request) {
        log.info("Processing heartbeat for session: {}", sessionId);

        LearningSessionEntity session = learningSessionRepository.findById(sessionId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, sessionId));

        // Chỉ xử lý heartbeat khi phiên còn ACTIVE.
        if (session.getStatus() != SessionStatusEnum.ACTIVE) {
            log.warn("Heartbeat received for non-active session: {}", sessionId);
            return learningSessionMapper.toResponse(session);
        }

        LocalDateTime now = LocalDateTime.now();

        // Nếu client có phát sinh thao tác (click, scroll,...)
        // thì cập nhật thời điểm tương tác cuối.
        if (request.isUserInteractionOccurred()) {
            session.setLastInteractionAt(now);
        }

        // Timeout
        if (session.getLastInteractionAt() != null) {
            long idleMinutes = Duration.between(session.getLastInteractionAt(), now).toMinutes();
            if (idleMinutes >= IDLE_TIMEOUT_MINUTES) {
                log.info("Session {} timed out due to idle user (> 12 mins without interaction).", sessionId);
                closeSessionInternal(session, SessionStatusEnum.IDLE_TIMEOUT, "IDLE_TIMEOUT: No user interaction for > 12 minutes");
                return learningSessionMapper.toResponse(session);
            }
        }

        // Mặc định mỗi heartbeat cộng thêm 30 giây thời gian học.
        int increment = request.getActiveSecondsIncrement() > 0 ? request.getActiveSecondsIncrement() : 30;
        session.setActiveSeconds(session.getActiveSeconds() + increment);
        session.setLastHeartbeatAt(now);

        LearningSessionEntity saved = learningSessionRepository.save(session);
        return learningSessionMapper.toResponse(saved);
    }

    // Ket thuc phien hoc
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

    // Lấy thông tin phiên học theo ID.
    @Override
    public LearningSessionResponse getById(Long id) {
        LearningSessionEntity entity = learningSessionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return learningSessionMapper.toResponse(entity);
    }

    // Lấy tất cả phiên ACTIVE của người dùng.
    @Override
    public List<LearningSessionResponse> getActiveSessionsForUser(Long userId) {
        return learningSessionMapper.toResponseList(learningSessionRepository.findByUserIdAndStatus(userId, SessionStatusEnum.ACTIVE));
    }

    // Đóng phiên học và thực hiện toàn bộ nghiệp vụ sau khi kết thúc.
    private void closeSessionInternal(LearningSessionEntity session, SessionStatusEnum finalStatus, String reason) {
        session.setStatus(finalStatus);
        session.setCloseReason(reason);
        learningSessionRepository.save(session);

        Map<String, Object> metadataMap = new LinkedHashMap<>();
        metadataMap.put("duration_seconds", session.getActiveSeconds());
        metadataMap.put("close_reason", reason != null ? reason : "");

        String jsonMetadata;
        try {
            jsonMetadata = jsonMapper.writeValueAsString(metadataMap);
        } catch (Exception e) {
            // Jackson 3: writeValueAsString ném RuntimeException (JacksonException)
            log.error("Failed to serialize activity log metadata for session {}", session.getId(), e);
            jsonMetadata = "{}";
        }

        LearningActivityLogEntity logEntry = LearningActivityLogEntity.builder()
                .userId(session.getUserId())
                .eventType("LEARNING_SESSION_END")
                .entityType(session.getEntityType())
                .entityId(session.getEntityId())
                .metadata(jsonMetadata)
                .occurredAt(LocalDateTime.now())
                .build();
        learningActivityLogRepository.save(logEntry);

        applicationEventPublisher.publishEvent(new StudySessionEndedEvent(this, session.getUserId()));
    }
}
