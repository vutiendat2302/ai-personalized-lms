package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.LessonProgressSearchRequest;
import com.ailms.response.LessonProgressResponse;


import com.ailms.entity.LessonProgressEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.LessonProgressMapper;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.request.LessonProgressRequest;
import com.ailms.response.LessonProgressResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * Service quản lý tiến độ học tập chi tiết của từng bài học.
 */
public interface ILessonProgressService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<LessonProgressResponse> search(LessonProgressSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<LessonProgressResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LessonProgressResponse getById(Long id);

    /**
     * Lấy tiến độ học bài học của học viên.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<LessonProgressResponse> getByUserId(Long userId);

    /**
     * Lấy danh sách tiến độ bài học của các học viên theo bài học.
     *
     * @param lessonId ID của bài học
     * @return danh sách các đối tượng phù hợp
     */
    List<LessonProgressResponse> getByLessonId(Long lessonId);

    /**
     * Lấy danh sách tiến độ bài học thuộc lượt đăng ký học cụ thể.
     *
     * @param enrollmentId ID của lượt đăng ký học
     * @return danh sách các đối tượng phù hợp
     */
    List<LessonProgressResponse> getByEnrollmentId(Long enrollmentId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LessonProgressResponse create(LessonProgressRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    LessonProgressResponse update(Long id, LessonProgressRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
