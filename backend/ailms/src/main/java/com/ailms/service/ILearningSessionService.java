package com.ailms.service;

import com.ailms.request.HeartbeatRequest;
import com.ailms.response.LearningSessionResponse;

import java.util.List;

public interface ILearningSessionService {

    /**
     * Bắt đầu một phiên học mới.
     *
     * @param userId ID người dùng
     * @param entityType loại đối tượng học
     * @param entityId ID đối tượng học
     * @return thông tin phiên học
     */
    LearningSessionResponse startSession(Long userId, String entityType, Long entityId);

    /**
     * Cập nhật heartbeat của phiên học.
     *
     * @param sessionId ID phiên học
     * @param request thông tin heartbeat
     * @return thông tin phiên học sau khi cập nhật
     */
    LearningSessionResponse heartbeat(Long sessionId, HeartbeatRequest request);

    /**
     * Kết thúc phiên học.
     *
     * @param sessionId ID phiên học
     * @param closeReason lý do kết thúc
     * @return thông tin phiên học
     */
    LearningSessionResponse endSession(Long sessionId, String closeReason);

    /**
     * Lấy thông tin phiên học theo ID.
     *
     * @param id ID phiên học
     * @return thông tin phiên học
     */
    LearningSessionResponse getById(Long id);

    /**
     * Lấy danh sách các phiên học đang hoạt động của người dùng.
     *
     * @param userId ID người dùng
     * @return danh sách phiên học đang hoạt động
     */
    List<LearningSessionResponse> getActiveSessionsForUser(Long userId);
}
