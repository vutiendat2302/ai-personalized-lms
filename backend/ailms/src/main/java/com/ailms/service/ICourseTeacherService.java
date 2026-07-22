package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.CourseTeacherSearchRequest;
import com.ailms.response.CourseTeacherResponse;


import com.ailms.entity.CourseEntity;
import com.ailms.entity.CourseTeacherEntity;
import com.ailms.entity.CourseTeacherId;
import com.ailms.entity.UserEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CourseTeacherMapper;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CourseTeacherRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.CourseTeacherRequest;
import com.ailms.response.CourseTeacherResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * Service quản lý việc phân công giáo viên phụ trách khóa học.
 */
public interface ICourseTeacherService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<CourseTeacherResponse> search(CourseTeacherSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<CourseTeacherResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param courseId ID của khóa học
     * @param userId ID của người dùng (User)
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseTeacherResponse getById(Long courseId, Long userId);

    /**
     * Lấy danh sách giáo viên phụ trách khóa học.
     *
     * @param courseId ID của khóa học
     * @return danh sách các đối tượng phù hợp
     */
    List<CourseTeacherResponse> getByCourseId(Long courseId);

    /**
     * Lấy danh sách khóa học mà giáo viên đang phụ trách.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<CourseTeacherResponse> getByUserId(Long userId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseTeacherResponse create(CourseTeacherRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param courseId ID của khóa học
     * @param userId ID của người dùng (User)
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseTeacherResponse update(Long courseId, Long userId, CourseTeacherRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param courseId ID của khóa học
     * @param userId ID của người dùng (User)
     */
    void delete(Long courseId, Long userId);
}
