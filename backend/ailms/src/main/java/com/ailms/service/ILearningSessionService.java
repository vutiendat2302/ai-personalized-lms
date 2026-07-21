package com.ailms.service;

import com.ailms.request.HeartbeatRequest;
import com.ailms.response.LearningSessionResponse;

import java.util.List;

public interface ILearningSessionService {

    LearningSessionResponse startSession(Long userId, String entityType, Long entityId);

    LearningSessionResponse heartbeat(Long sessionId, HeartbeatRequest request);

    LearningSessionResponse endSession(Long sessionId, String closeReason);

    LearningSessionResponse getById(Long id);

    List<LearningSessionResponse> getActiveSessionsForUser(Long userId);
}
