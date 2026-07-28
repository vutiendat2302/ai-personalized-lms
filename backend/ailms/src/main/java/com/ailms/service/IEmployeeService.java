package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.EmployeeResponse;
import com.ailms.response.PageResponse;

import java.util.List;
import java.util.Map;

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
     * Đồng bộ khởi tạo thủ công các tài khoản nhân sự chưa có hồ sơ Employee.
     */
    void syncMissingStaffEmployeeProfiles();

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

    /**
     * Lấy danh sách các nhân viên đang ở trạng thái xóa mềm (DELETED).
     */
    List<EmployeeResponse> getTrashEmployees();

    /**
     * Xóa cứng (vĩnh viễn) hồ sơ nhân viên khỏi cơ sở dữ liệu.
     *
     * @param id ID nhân viên
     */
    void hardDelete(Long id);

    /**
     * Xóa cứng hàng loạt danh sách nhân viên theo IDs.
     */
    Map<String, Object> bulkHardDelete(List<Long> ids);

    /**
     * Thống kê trạng thái hợp đồng nhân viên theo năm (tùy chọn).
     */
    Map<String, Long> getContractStatusStats(Integer year);

    /**
     * Lấy số hợp đồng thử việc sắp hết hạn trong 7 ngày tới (Real-time).
     */
    long getExpiringProbationCount();

    /**
     * Gửi email/notification thông báo HR về các hợp đồng thử việc sắp hết hạn.
     */
    void notifyExpiringProbation();

    /**
     * Thống kê số lượng nhân viên theo vai trò nội bộ theo năm (tùy chọn).
     */
    Map<String, Long> getStaffRoleStats(Integer year);

    /**
     * Số lượng nhân viên theo trạng thái (Real-time).
     */
    Map<String, Long> countEmployeesByStatus();

    /**
     * Số lượng nhân viên theo phòng ban theo năm (tùy chọn).
     */
    Map<String, Long> countEmployeesByDepartment(Integer year);

    /**
     * Số lượng nhân viên theo loại hình hợp đồng theo năm (tùy chọn).
     */
    Map<String, Long> countEmployeesByEmploymentType(Integer year);

    /**
     * Số lượng nhân viên theo giới tính theo năm (tùy chọn).
     */
    Map<String, Long> getEmployeeStatsByGender(Integer year);

    /**
     * Số lượng nhân viên theo độ tuổi theo năm (tùy chọn).
     */
    Map<String, Long> getEmployeeStatsByAgeGroup(Integer year);

    /**
     * Xuất file excel danh sách nhân viên, chứa thông tin của nhân viên (chi tiết)
     */
    byte[] exportEmployeeToExcel(EmployeeSearchRequest request);

    /**
     * Xuất file excel chi tiết 1 người dùng (gồm tài khoản, hồ sơ cá nhân nhân viên và hệ thống (hợp đồng, chấm công, đơn giá dạy với ta, lương, ... )
     */
    byte[] exportEmployeeDetailToExcel(Long userId);
}



