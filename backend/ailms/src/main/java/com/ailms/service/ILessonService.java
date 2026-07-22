package com.ailms.service;

import com.ailms.request.CreateLessonRequest;
import com.ailms.request.LessonSearchRequest;
import com.ailms.request.ReorderRequest;
import com.ailms.request.UpdateLessonRequest;
import com.ailms.response.LessonPreviewResponse;
import com.ailms.response.LessonResponse;
import com.ailms.response.PageResponse;

import java.util.List;

/**
 * Service quản lý các bài học (Lesson) trong chương học.
 */
public interface ILessonService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<LessonResponse> search(LessonSearchRequest request);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LessonResponse create(CreateLessonRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LessonResponse update(Long id, UpdateLessonRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LessonResponse getById(Long id);

    /**
     * Lấy thông tin bài học kèm theo quyền xem thử dành cho học viên.
     *
     * @param id ID của bản ghi cần xử lý
     * @param currentUserId Tham số currentUserId
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LessonPreviewResponse getLessonWithPreview(Long id, Long currentUserId);

    /**
     * Lấy danh sách bài học trong một chương học.
     *
     * @param sectionId Tham số sectionId
     * @return danh sách các đối tượng phù hợp
     */
    List<LessonResponse> getLessonsBySectionId(Long sectionId);

    /**
     * Sắp xếp lại thứ tự các bài học trong một chương.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void reorder(ReorderRequest request);
}
