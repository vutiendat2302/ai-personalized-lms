package com.ailms.service;

import com.ailms.request.CreateLearningActivityLogRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.LearningActivityLogSearchRequest;
import com.ailms.response.LearningActivityLogResponse;


import java.util.List;

/**
 * Service ghi nhận nhật ký hoạt động học tập của học viên.
 */
public interface ILearningActivityLogService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<LearningActivityLogResponse> search(LearningActivityLogSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<LearningActivityLogResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LearningActivityLogResponse getById(Long id);

    /**
     * Lấy nhật ký hoạt động học tập theo ID học viên.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<LearningActivityLogResponse> getByUserId(Long userId);

    /**
     * Lấy nhật ký hoạt động học tập liên quan đến một thực thể cụ thể.
     *
     * @param entityType Tham số entityType
     * @param entityId Tham số entityId
     * @return danh sách các đối tượng phù hợp
     */
    List<LearningActivityLogResponse> getByEntity(String entityType, Long entityId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LearningActivityLogResponse create(CreateLearningActivityLogRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
