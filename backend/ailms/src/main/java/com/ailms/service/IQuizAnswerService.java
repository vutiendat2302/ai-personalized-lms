package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.QuizAnswerSearchRequest;
import com.ailms.response.QuizAnswerResponse;

import com.ailms.entity.QuizAnswerEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuizAnswerMapper;
import com.ailms.repository.QuizAnswerRepository;
import com.ailms.request.QuizAnswerRequest;
import com.ailms.response.QuizAnswerResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * Service quản lý câu trả lời của học viên trong các lượt làm bài kiểm tra trắc nghiệm.
 */
public interface IQuizAnswerService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<QuizAnswerResponse> search(QuizAnswerSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<QuizAnswerResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuizAnswerResponse getById(Long id);

    /**
     * Lấy danh sách câu trả lời của học viên trong một lượt làm bài quiz.
     *
     * @param attemptId ID của lượt làm bài kiểm tra trắc nghiệm
     * @return danh sách các đối tượng phù hợp
     */
    List<QuizAnswerResponse> getByAttemptId(Long attemptId);

    /**
     * Lấy danh sách câu trả lời liên quan đến câu hỏi cụ thể.
     *
     * @param questionId Tham số questionId
     * @return danh sách các đối tượng phù hợp
     */
    List<QuizAnswerResponse> getByQuestionId(Long questionId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuizAnswerResponse create(QuizAnswerRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuizAnswerResponse update(Long id, QuizAnswerRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
