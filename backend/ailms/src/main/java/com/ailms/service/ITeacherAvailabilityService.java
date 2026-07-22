package com.ailms.service;

import com.ailms.request.TeacherAvailabilityRequest;
import com.ailms.request.UpdateTeacherAvailabilityRequest;
import com.ailms.response.TeacherAvailabilityResponse;

import java.util.List;

/**
 * Service quản lý khung giờ rảnh/lịch dạy của giáo viên.
 */
public interface ITeacherAvailabilityService {

    /**
     * Thêm khung thời gian rảnh của giáo viên dạy học.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    TeacherAvailabilityResponse addTeacherAvailability(TeacherAvailabilityRequest request);

    /**
     * Lấy thông tin chi tiết khung giờ rảnh theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    TeacherAvailabilityResponse getTeacherAvailabilityById(Long id);

    /**
     * Lấy danh sách các khung giờ rảnh của giáo viên theo ID nhân viên.
     *
     * @param employeeId ID của nhân viên
     * @return danh sách các đối tượng phù hợp
     */
    List<TeacherAvailabilityResponse> getTeacherAvailabilitiesByEmployeeId(Long employeeId);

    /**
     * Cập nhật khung giờ rảnh của giáo viên.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    TeacherAvailabilityResponse updateTeacherAvailability(Long id, UpdateTeacherAvailabilityRequest request);

    /**
     * Xóa khung giờ rảnh của giáo viên.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void deleteTeacherAvailability(Long id);
}
