package com.ailms.service;

import com.ailms.request.CreateEmployeeContractRequest;
import com.ailms.request.UpdateEmployeeContractRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.EmployeeContractSearchRequest;
import com.ailms.response.EmployeeContractResponse;
import java.util.List;

/**
 * Service quản lý hợp đồng lao động của nhân viên.
 */
public interface IEmployeeContractService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<EmployeeContractResponse> search(EmployeeContractSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<EmployeeContractResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    EmployeeContractResponse getById(Long id);

    /**
     * Lấy danh sách hợp đồng lao động theo ID nhân viên.
     *
     * @param employeeId ID của nhân viên
     * @return danh sách các đối tượng phù hợp
     */
    List<EmployeeContractResponse> getByEmployeeId(Long employeeId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    EmployeeContractResponse create(CreateEmployeeContractRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    EmployeeContractResponse update(Long id, UpdateEmployeeContractRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
