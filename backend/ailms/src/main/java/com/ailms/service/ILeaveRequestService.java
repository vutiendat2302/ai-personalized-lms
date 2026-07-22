package com.ailms.service;

import com.ailms.request.CreateLeaveRequest;
import com.ailms.request.LeaveRequestSearchRequest;
import com.ailms.request.UpdateLeaveRequest;
import com.ailms.response.LeaveRequestResponse;
import com.ailms.response.PageResponse;

import java.util.List;

/**
 * Service quản lý các yêu cầu nghỉ phép của nhân viên.
 */
public interface ILeaveRequestService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<LeaveRequestResponse> search(LeaveRequestSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<LeaveRequestResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LeaveRequestResponse getById(Long id);

    /**
     * Lấy danh sách yêu cầu nghỉ phép của một nhân viên.
     *
     * @param employeeId ID của nhân viên
     * @return danh sách các đối tượng phù hợp
     */
    List<LeaveRequestResponse> getByEmployeeId(Long employeeId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LeaveRequestResponse create(CreateLeaveRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LeaveRequestResponse update(Long id, UpdateLeaveRequest request);

    /**
     * Phê duyệt hoặc từ chối yêu cầu nghỉ phép.
     *
     * @param id ID của bản ghi cần xử lý
     * @param approve true nếu đồng ý phê duyệt, false nếu từ chối
     * @param rejectionReason Lý do từ chối phê duyệt
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LeaveRequestResponse approve(Long id, boolean approve, String rejectionReason);

    /**
     * Người dùng tự hủy yêu cầu xin nghỉ phép của mình.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void cancel(Long id);
}
