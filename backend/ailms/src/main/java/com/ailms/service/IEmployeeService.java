package com.ailms.service;

import com.ailms.request.CreateEmployeeContractRequest;
import com.ailms.request.CreateEmployeeRequest;
import com.ailms.request.EmployeeSearchRequest;
import com.ailms.request.UpdateEmployeeRequest;
import com.ailms.response.EmployeeResponse;
import com.ailms.response.PageResponse;

import java.util.List;

/**
 * Service quản lý thông tin và hồ sơ nhân sự (nhân viên/giáo viên).
 */
public interface IEmployeeService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<EmployeeResponse> search(EmployeeSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<EmployeeResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    EmployeeResponse getById(Long id);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    EmployeeResponse create(CreateEmployeeRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    EmployeeResponse update(Long id, UpdateEmployeeRequest request);

    /**
     * Xóa mềm hồ sơ nhân viên trong hệ thống.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void softDelete(Long id);

    /**
     * Thực hiện chấm dứt hợp đồng và thôi việc cho nhân viên.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    EmployeeResponse terminate(Long id);

    /**
     * Đánh giá kết quả thử việc của nhân viên và đề xuất ký hợp đồng mới nếu đạt.
     *
     * @param id ID của bản ghi cần xử lý
     * @param pass Tham số pass
     * @param newContractRequest Tham số newContractRequest
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    EmployeeResponse probationReview(Long id, boolean pass, CreateEmployeeContractRequest newContractRequest);

    /**
     * Lấy ra tổng số lượng nhân viên trong hệ thống (không bao gồm nhân viên đã bị xóa)
     */
    long countEmployees();

    /**
     * Lấy thông tin chi tiết nhân viên theo ID, trả về null nếu không tìm thấy hoặc đã bị xóa.
     *
     * @param id ID nhân viên (userId)
     * @return EmployeeResponse hoặc null
     */
    EmployeeResponse findByIdOrNull(Long id);
}


