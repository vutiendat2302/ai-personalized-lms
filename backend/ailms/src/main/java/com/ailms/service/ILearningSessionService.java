package com.ailms.service;

import com.ailms.request.HeartbeatRequest;
import com.ailms.response.LearningSessionResponse;

import java.util.List;

/**
 * Service quản lý phiên học tập trực tuyến thời gian thực (tracking thời gian học).
 */
public interface ILearningSessionService {

    /**
     * Khởi tạo một phiên học tập trực tuyến mới.
     *
     * @param userId ID của người dùng (User)
     * @param entityType Tham số entityType
     * @param entityId Tham số entityId
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LearningSessionResponse startSession(Long userId, String entityType, Long entityId);

    /**
     * Gửi tín hiệu duy trì kết nối (heartbeat) để cập nhật thời gian học thực tế.
     *
     * @param sessionId ID của phiên học trực tuyến đang theo dõi
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LearningSessionResponse heartbeat(Long sessionId, HeartbeatRequest request);

    /**
     * Kết thúc phiên học tập trực tuyến hiện tại.
     *
     * @param sessionId ID của phiên học trực tuyến đang theo dõi
     * @param closeReason Lý do đóng/kết thúc phiên học trực tuyến
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LearningSessionResponse endSession(Long sessionId, String closeReason);

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LearningSessionResponse getById(Long id);

    /**
     * Lấy danh sách các phiên học đang hoạt động của người dùng.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<LearningSessionResponse> getActiveSessionsForUser(Long userId);
}
