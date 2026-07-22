package com.ailms.service;

import com.ailms.request.CreateGuardianRequest;
import com.ailms.request.UpdateGuardianRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.GuardianSearchRequest;
import com.ailms.response.GuardianResponse;


import java.util.List;

/**
 * Service quản lý thông tin phụ huynh/người giám hộ của học viên.
 */
public interface IGuardianService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<GuardianResponse> search(GuardianSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<GuardianResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    GuardianResponse getById(Long id);

    /**
     * Lấy danh sách phụ huynh của một học viên dựa trên ID học viên.
     *
     * @param studentUserId ID người dùng của học viên
     * @return danh sách các đối tượng phù hợp
     */
    List<GuardianResponse> getByStudentUserId(Long studentUserId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    GuardianResponse create(CreateGuardianRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    GuardianResponse update(Long id, UpdateGuardianRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
