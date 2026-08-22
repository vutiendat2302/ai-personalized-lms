package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.LessonResourceSearchRequest;



import com.ailms.request.CreateResourceRequest;
import com.ailms.request.UpdateResourceRequest;
import com.ailms.response.ResourceResponse;

import java.util.List;

/**
 * Service quản lý tài nguyên, tài liệu đính kèm của bài học.
 */
public interface ILessonResourceService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<ResourceResponse> search(LessonResourceSearchRequest request);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ResourceResponse create(CreateResourceRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ResourceResponse update(Long id, UpdateResourceRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);

    /**
     * Lấy danh sách tài nguyên học liệu của một bài học.
     *
     * @param lessonId ID của bài học
     * @return danh sách các đối tượng phù hợp
     */
    List<ResourceResponse> getResourcesByLessonId(Long lessonId);
}
