package com.ailms.service;

import com.ailms.request.CreateClassRequest;
import com.ailms.request.UpdateClassRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.ClassSearchRequest;
import com.ailms.response.ClassResponse;


import java.util.List;

/**
 * Service quản lý thông tin các lớp học.
 */
public interface IClassService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<ClassResponse> search(ClassSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<ClassResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ClassResponse getById(Long id);

    /**
     * Lấy danh sách các lớp học thuộc khóa học cụ thể.
     *
     * @param courseId ID của khóa học
     * @return danh sách các đối tượng phù hợp
     */
    List<ClassResponse> getByCourseId(Long courseId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ClassResponse create(CreateClassRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ClassResponse update(Long id, UpdateClassRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
