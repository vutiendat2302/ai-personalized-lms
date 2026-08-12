package com.ailms.service;

import com.ailms.request.CreateCoursePackageRequest;
import com.ailms.request.CoursePackageSearchRequest;
import com.ailms.request.UpdateCoursePackageRequest;
import com.ailms.response.CoursePackageResponse;
import com.ailms.response.CoursePackageStatsResponse;
import com.ailms.response.PageResponse;

import java.util.List;

/**
 * Service quản lý các gói học phí/học phần của khóa học.
 */
public interface ICoursePackageService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<CoursePackageResponse> search(CoursePackageSearchRequest request);

    /**
     * Lấy thống kê tổng quan số lượng gói bán theo trạng thái.
     *
     * @return thống kê số lượng gói bán
     */
    CoursePackageStatsResponse getStats();

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<CoursePackageResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CoursePackageResponse getById(Long id);

    /**
     * Lấy danh sách các gói học phí thuộc khóa học.
     *
     * @param courseId ID của khóa học
     * @return danh sách các đối tượng phù hợp
     */
    List<CoursePackageResponse> getByCourseId(Long courseId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CoursePackageResponse create(CreateCoursePackageRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CoursePackageResponse update(Long id, UpdateCoursePackageRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
