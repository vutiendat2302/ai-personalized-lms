package com.ailms.service;

import com.ailms.request.CreateTeacherCategoryRequest;
import com.ailms.request.UpdateTeacherCategoryRequest;
import com.ailms.response.TeacherCategoryResponse;

import java.util.List;

/**
 * Service quản lý danh mục môn học/kỹ năng giảng dạy của giáo viên.
 */
public interface ITeacherCategoryService {

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<TeacherCategoryResponse> getAll();

    /**
     * Lấy danh sách các danh mục môn học mà giáo viên được phân giảng dạy.
     *
     * @param employeeId ID của nhân viên
     * @return danh sách các đối tượng phù hợp
     */
    List<TeacherCategoryResponse> getByEmployeeId(Long employeeId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    TeacherCategoryResponse create(CreateTeacherCategoryRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);

    /**
     * Gán giáo viên vào giảng dạy một danh mục môn học cụ thể.
     *
     * @param categoryId ID của danh mục khóa học
     * @param employeeId ID của nhân viên
     * @param adminUserId ID của quản trị viên thực hiện thao tác
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    TeacherCategoryResponse assignTeacherToCategory(Long categoryId, Long employeeId, Long adminUserId);

    /**
     * Hủy gán giáo viên khỏi danh mục môn học.
     *
     * @param categoryId ID của danh mục khóa học
     * @param employeeId ID của nhân viên
     */
    void unassignTeacherFromCategory(Long categoryId, Long employeeId);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void update(Long id, UpdateTeacherCategoryRequest request);
}
