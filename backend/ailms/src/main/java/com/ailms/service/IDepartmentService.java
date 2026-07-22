package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.DepartmentResponse;
import com.ailms.response.PageResponse;

import java.util.List;

/**
 * Service quản lý các phòng ban tổ chức trong hệ thống.
 */
public interface IDepartmentService {

    /**
     * Phương thức xử lý nghiệp vụ createDepartment.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    DepartmentResponse createDepartment(CreateDepartmentRequest request);

    /**
     * Phương thức xử lý nghiệp vụ updateDepartment.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    DepartmentResponse updateDepartment(Long id, UpdateDepartmentRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);

    /**
     * Phương thức xử lý nghiệp vụ getDepartmentById.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    DepartmentResponse getDepartmentById(Long id);

    /**
     * Phương thức xử lý nghiệp vụ getDepartments.
     * @return danh sách các đối tượng phù hợp
     */
    List<DepartmentResponse> getDepartments();

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<DepartmentResponse> search(DepartmentSearchRequest request);
}
