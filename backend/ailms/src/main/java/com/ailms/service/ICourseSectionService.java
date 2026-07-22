package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.CourseSectionSearchRequest;



import com.ailms.request.CreateSectionRequest;
import com.ailms.request.UpdateSectionRequest;
import com.ailms.request.ReorderRequest;
import com.ailms.response.SectionResponse;

import java.util.List;

/**
 * Service quản lý các chương học (Section) trong khóa học.
 */
public interface ICourseSectionService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<SectionResponse> search(CourseSectionSearchRequest request);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    SectionResponse create(CreateSectionRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    SectionResponse update(Long id, UpdateSectionRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);

    /**
     * Lấy danh sách chương học theo ID khóa học.
     *
     * @param courseId ID của khóa học
     * @return danh sách các đối tượng phù hợp
     */
    List<SectionResponse> getSectionsByCourseId(Long courseId);

    /**
     * Thay đổi thứ tự sắp xếp của các chương học.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void reorder(ReorderRequest request);

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    SectionResponse getById(Long id);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<SectionResponse> getAll();
}
