package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.CourseProgressSearchRequest;
import com.ailms.response.CourseProgressResponse;


import com.ailms.entity.CourseProgressEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CourseProgressMapper;
import com.ailms.repository.CourseProgressRepository;
import com.ailms.request.CourseProgressRequest;
import com.ailms.response.CourseProgressResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * Service theo dõi tiến độ hoàn thành khóa học của học viên.
 */
public interface ICourseProgressService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<CourseProgressResponse> search(CourseProgressSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<CourseProgressResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseProgressResponse getById(Long id);

    /**
     * Lấy tiến độ học tập của người dùng.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<CourseProgressResponse> getByUserId(Long userId);

    /**
     * Lấy tiến độ học tập theo khóa học.
     *
     * @param courseId ID của khóa học
     * @return danh sách các đối tượng phù hợp
     */
    List<CourseProgressResponse> getByCourseId(Long courseId);

    /**
     * Lấy tiến độ học tập theo ID đăng ký học.
     *
     * @param enrollmentId ID của lượt đăng ký học
     * @return danh sách các đối tượng phù hợp
     */
    List<CourseProgressResponse> getByEnrollmentId(Long enrollmentId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseProgressResponse create(CourseProgressRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseProgressResponse update(Long id, CourseProgressRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
