package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.CourseMemberSearchRequest;
import com.ailms.response.CourseMemberResponse;


import com.ailms.entity.CourseEntity;
import com.ailms.entity.CourseMemberEntity;
import com.ailms.entity.CourseMemberId;
import com.ailms.entity.UserEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CourseMemberMapper;
import com.ailms.repository.CourseMemberRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.CourseMemberRequest;
import com.ailms.response.CourseMemberResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * Service quản lý học viên tham gia các khóa học.
 */
public interface ICourseMemberService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<CourseMemberResponse> search(CourseMemberSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<CourseMemberResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param courseId ID của khóa học
     * @param userId ID của người dùng (User)
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseMemberResponse getById(Long courseId, Long userId);

    /**
     * Lấy danh sách thành viên thuộc khóa học.
     *
     * @param courseId ID của khóa học
     * @return danh sách các đối tượng phù hợp
     */
    List<CourseMemberResponse> getByCourseId(Long courseId);

    /**
     * Lấy danh sách khóa học mà người dùng là thành viên.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<CourseMemberResponse> getByUserId(Long userId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseMemberResponse create(CourseMemberRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param courseId ID của khóa học
     * @param userId ID của người dùng (User)
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CourseMemberResponse update(Long courseId, Long userId, CourseMemberRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param courseId ID của khóa học
     * @param userId ID của người dùng (User)
     */
    void delete(Long courseId, Long userId);
}
