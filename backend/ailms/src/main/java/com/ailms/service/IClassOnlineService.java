package com.ailms.service;

import com.ailms.request.UpdateClassOnlineRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.ClassOnlineSearchRequest;
import com.ailms.response.ClassOnlineResponse;


import com.ailms.request.CreateClassOnlineRequest;

import java.util.List;

/**
 * Service quản lý các buổi học trực tuyến (Online Class / Zoom / Meet sessions).
 */
public interface IClassOnlineService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<ClassOnlineResponse> search(ClassOnlineSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<ClassOnlineResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ClassOnlineResponse getById(Long id);

    /**
     * Lấy danh sách các buổi học trực tuyến theo ID lớp học.
     *
     * @param classId ID của lớp học
     * @return danh sách các đối tượng phù hợp
     */
    List<ClassOnlineResponse> getByClassId(Long classId);

    /**
     * Lấy danh sách các buổi học trực tuyến theo ID giáo viên.
     *
     * @param teacherId Tham số teacherId
     * @return danh sách các đối tượng phù hợp
     */
    List<ClassOnlineResponse> getByTeacherId(Long teacherId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ClassOnlineResponse create(CreateClassOnlineRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ClassOnlineResponse update(Long id, UpdateClassOnlineRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);

    PageResponse<ClassOnlineResponse> getSessionsPage(Long classId, String keyword, String status, int page, int size, String sortDirection);
}
