package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.AssignmentSearchRequest;
import com.ailms.response.AssignmentResponse;

import com.ailms.entity.AssignmentEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.AssignmentMapper;
import com.ailms.repository.AssignmentRepository;
import com.ailms.request.AssignmentRequest;
import com.ailms.response.AssignmentResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * Service quản lý các bài tập tự luận (Assignment).
 */
public interface IAssignmentService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<AssignmentResponse> search(AssignmentSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<AssignmentResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    AssignmentResponse getById(Long id);

    /**
     * Lấy danh sách bài tập thuộc một bài học cụ thể.
     *
     * @param lessonId ID của bài học
     * @return danh sách các đối tượng phù hợp
     */
    List<AssignmentResponse> getByLessonId(Long lessonId);

    /**
     * Lấy danh sách bài tập thuộc một khóa học cụ thể.
     *
     * @param courseId ID của khóa học
     * @return danh sách các đối tượng phù hợp
     */
    List<AssignmentResponse> getByCourseId(Long courseId);

    /**
     * Lấy danh sách bài tập thuộc một chương học cụ thể.
     *
     * @param sectionId Tham số sectionId
     * @return danh sách các đối tượng phù hợp
     */
    List<AssignmentResponse> getBySectionId(Long sectionId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    AssignmentResponse create(AssignmentRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    AssignmentResponse update(Long id, AssignmentRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
