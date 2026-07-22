package com.ailms.service;

import com.ailms.request.CreateTeachingRateRequest;
import com.ailms.request.UpdateTeachingRateRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.TeachingRateSearchRequest;
import com.ailms.response.TeachingRateResponse;


import java.util.List;

/**
 * Service quản lý mức lương/thù lao theo giờ giảng dạy của giáo viên.
 */
public interface ITeachingRateService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<TeachingRateResponse> search(TeachingRateSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<TeachingRateResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    TeachingRateResponse getById(Long id);

    /**
     * Lấy danh sách mức lương/giờ giảng dạy của giáo viên.
     *
     * @param employeeId ID của nhân viên
     * @return danh sách các đối tượng phù hợp
     */
    List<TeachingRateResponse> getByEmployeeId(Long employeeId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    TeachingRateResponse create(CreateTeachingRateRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    TeachingRateResponse update(Long id, UpdateTeachingRateRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
