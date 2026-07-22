package com.ailms.service;

import com.ailms.request.CreateSalaryRequest;
import com.ailms.request.UpdateSalaryRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.SalarySearchRequest;
import com.ailms.response.SalaryResponse;
import java.util.List;

/**
 * Service quản lý và tính toán bảng lương nhân viên.
 */
public interface ISalaryService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<SalaryResponse> search(SalarySearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<SalaryResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    SalaryResponse getById(Long id);

    /**
     * Lấy danh sách bảng lương của một nhân viên cụ thể.
     *
     * @param employeeId ID của nhân viên
     * @return danh sách các đối tượng phù hợp
     */
    List<SalaryResponse> getByEmployeeId(Long employeeId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    SalaryResponse create(CreateSalaryRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    SalaryResponse update(Long id, UpdateSalaryRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);

    /**
     * Phê duyệt bảng lương nhân viên.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    SalaryResponse approve(Long id);

    /**
     * Xác nhận đã thanh toán lương cho nhân viên.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    SalaryResponse pay(Long id);
}
