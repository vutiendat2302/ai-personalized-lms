package com.ailms.service;

import com.ailms.entity.enums.AttendanceStatusEnum;
import com.ailms.request.AttendanceSearchRequest;
import com.ailms.request.CreateAttendanceRequest;
import com.ailms.request.SimulateAttendanceRequest;
import com.ailms.request.UpdateAttendanceRequest;
import com.ailms.response.AttendanceResponse;
import com.ailms.response.AttendanceSummaryResponse;
import com.ailms.response.PageResponse;

import java.time.LocalDate;
import java.util.List;

/**
 * Service quản lý chuyên cần và điểm danh hàng ngày của nhân viên/giáo viên.
 */
public interface IAttendanceService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     */
    PageResponse<AttendanceResponse> search(AttendanceSearchRequest request);

    /**
     * Lấy dữ liệu tổng quan mét thống kê & biểu đồ theo khoảng thời gian.
     */
    AttendanceSummaryResponse getSummary(LocalDate fromDate, LocalDate toDate, Long departmentId);

    /**
     * Lấy danh sách tất cả các bản ghi.
     */
    List<AttendanceResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     */
    AttendanceResponse getById(Long id);

    /**
     * Lấy danh sách dữ liệu chuyên cần của nhân viên theo ID nhân viên.
     */
    List<AttendanceResponse> getByEmployeeId(Long employeeId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     */
    AttendanceResponse create(CreateAttendanceRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID (HR sửa tay, bắt buộc có note).
     */
    AttendanceResponse update(Long id, UpdateAttendanceRequest request);

    /**
     * Phê duyệt bản ghi chỉnh sửa tay.
     */
    AttendanceResponse approve(Long id);

    /**
     * Phê duyệt hàng loạt danh sách bản ghi.
     */
    void bulkApprove(List<Long> ids);

    /**
     * Sinh dữ liệu giả lập chấm công cho khoảng thời gian chỉ định (Mô phỏng demo/dev).
     */
    int simulate(SimulateAttendanceRequest request);

    /**
     * Xuất báo cáo chấm công tháng dạng CSV.
     */
    byte[] exportCsv(AttendanceSearchRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     */
    void delete(Long id);

    /**
     * Thực hiện check-in điểm danh hàng ngày cho nhân viên.
     */
    AttendanceResponse checkIn(Long employeeId, String note);

    /**
     * Thực hiện check-out điểm danh hàng ngày cho nhân viên.
     */
    AttendanceResponse checkOut(Long employeeId, String note);

    /**
     * Cập nhật trạng thái điểm danh chuyên cần.
     */
    AttendanceResponse updateStatus(Long id, AttendanceStatusEnum status);
}
