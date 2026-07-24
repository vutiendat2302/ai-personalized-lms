package com.ailms.service;

import com.ailms.entity.enums.AttendanceStatusEnum;
import com.ailms.request.AttendanceSearchRequest;
import com.ailms.request.CreateAttendanceRequest;
import com.ailms.request.UpdateAttendanceRequest;
import com.ailms.response.AttendanceResponse;
import com.ailms.response.PageResponse;

import java.util.List;

/**
 * Service quản lý chuyên cần và điểm danh hàng ngày của nhân viên/giáo viên.
 */
public interface IAttendanceService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<AttendanceResponse> search(AttendanceSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<AttendanceResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    AttendanceResponse getById(Long id);

    /**
     * Lấy danh sách dữ liệu chuyên cần của nhân viên theo ID nhân viên.
     *
     * @param employeeId ID của nhân viên
     * @return danh sách các đối tượng phù hợp
     */
    List<AttendanceResponse> getByEmployeeId(Long employeeId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    AttendanceResponse create(CreateAttendanceRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    AttendanceResponse update(Long id, UpdateAttendanceRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);

    /**
     * Thực hiện check-in điểm danh hàng ngày cho nhân viên.
     *
     * @param employeeId ID của nhân viên
     * @param note Ghi chú kèm theo khi thực hiện thao tác
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    AttendanceResponse checkIn(Long employeeId, String note);

    /**
     * Thực hiện check-out điểm danh hàng ngày cho nhân viên.
     *
     * @param employeeId ID của nhân viên
     * @param note Ghi chú kèm theo khi thực hiện thao tác
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    AttendanceResponse checkOut(Long employeeId, String note);

    /**
     * Cập nhật trạng thái điểm danh chuyên cần.
     *
     * @param id ID của bản ghi cần xử lý
     * @param status Trạng thái mới cần cập nhật
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    AttendanceResponse updateStatus(Long id, AttendanceStatusEnum status);
}
