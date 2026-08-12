package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.QuizSearchRequest;
import com.ailms.response.QuizResponse;

import com.ailms.entity.QuizEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuizMapper;
import com.ailms.repository.QuizRepository;
import com.ailms.request.QuizRequest;
import com.ailms.response.QuizResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * Service quản lý các đề kiểm tra trắc nghiệm (Quiz).
 */
public interface IQuizService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<QuizResponse> search(QuizSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<QuizResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuizResponse getById(Long id);

    /**
     * Lấy danh sách đề kiểm tra thuộc bài học.
     *
     * @param lessonId ID của bài học
     * @return danh sách các đối tượng phù hợp
     */
    List<QuizResponse> getByLessonId(Long lessonId);

    /**
     * Lấy danh sách đề kiểm tra thuộc khóa học.
     *
     * @param courseId ID của khóa học
     * @return danh sách các đối tượng phù hợp
     */
    List<QuizResponse> getByCourseId(Long courseId);

    /**
     * Lấy danh sách đề kiểm tra thuộc chương học.
     *
     * @param sectionId Tham số sectionId
     * @return danh sách các đối tượng phù hợp
     */
    List<QuizResponse> getBySectionId(Long sectionId);

    /** Lấy quiz/bài thi được giao cho một lớp cụ thể. */
    List<QuizResponse> getByClassId(Long classId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuizResponse create(QuizRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuizResponse update(Long id, QuizRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
