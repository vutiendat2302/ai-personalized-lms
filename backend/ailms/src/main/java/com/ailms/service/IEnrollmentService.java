package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.EnrollmentSearchRequest;
import com.ailms.response.EnrollmentResponse;


import com.ailms.entity.ClassEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.UserEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.EnrollmentMapper;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.EnrollmentRequest;
import com.ailms.response.EnrollmentResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * Service quản lý thông tin đăng ký lớp học/khóa học của học viên.
 */
public interface IEnrollmentService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<EnrollmentResponse> search(EnrollmentSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<EnrollmentResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    EnrollmentResponse getById(Long id);

    /**
     * Lấy danh sách đăng ký học của học viên.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<EnrollmentResponse> getByUserId(Long userId);

    /**
     * Lấy danh sách đăng ký học theo khóa học.
     *
     * @param courseId ID của khóa học
     * @return danh sách các đối tượng phù hợp
     */
    List<EnrollmentResponse> getByCourseId(Long courseId);

    /**
     * Lấy danh sách đăng ký học theo lớp học.
     *
     * @param classId ID của lớp học
     * @return danh sách các đối tượng phù hợp
     */
    List<EnrollmentResponse> getByClassId(Long classId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    EnrollmentResponse create(EnrollmentRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    EnrollmentResponse update(Long id, EnrollmentRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
