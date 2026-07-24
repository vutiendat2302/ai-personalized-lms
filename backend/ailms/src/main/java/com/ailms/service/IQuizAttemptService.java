package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.QuizAttemptSearchRequest;
import com.ailms.response.QuizAttemptResponse;

import com.ailms.entity.QuizAttemptEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuizAttemptMapper;
import com.ailms.repository.QuizAttemptRepository;
import com.ailms.request.QuizAttemptRequest;
import com.ailms.response.QuizAttemptResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * Service quản lý các lượt làm bài kiểm tra (Quiz Attempt) của học viên.
 */
public interface IQuizAttemptService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<QuizAttemptResponse> search(QuizAttemptSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<QuizAttemptResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuizAttemptResponse getById(Long id);

    /**
     * Lấy danh sách các lượt làm bài kiểm tra theo ID quiz.
     *
     * @param quizId ID của đề kiểm tra trắc nghiệm (quiz)
     * @return danh sách các đối tượng phù hợp
     */
    List<QuizAttemptResponse> getByQuizId(Long quizId);

    /**
     * Lấy danh sách các lượt làm bài kiểm tra của một học viên.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<QuizAttemptResponse> getByUserId(Long userId);

    /**
     * Lấy danh sách các lượt làm bài kiểm tra của một lượt đăng ký học.
     *
     * @param enrollmentId ID của lượt đăng ký học
     * @return danh sách các đối tượng phù hợp
     */
    List<QuizAttemptResponse> getByEnrollmentId(Long enrollmentId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuizAttemptResponse create(QuizAttemptRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuizAttemptResponse update(Long id, QuizAttemptRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
