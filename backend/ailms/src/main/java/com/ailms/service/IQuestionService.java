package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.QuestionSearchRequest;
import com.ailms.response.QuestionResponse;

import com.ailms.entity.QuestionEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuestionMapper;
import com.ailms.repository.QuestionRepository;
import com.ailms.request.QuestionRequest;
import com.ailms.response.QuestionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * Service quản lý câu hỏi trong các đề kiểm tra (Quiz).
 */
public interface IQuestionService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<QuestionResponse> search(QuestionSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<QuestionResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuestionResponse getById(Long id);

    /**
     * Lấy danh sách câu hỏi thuộc đề kiểm tra (quiz).
     *
     * @param quizId ID của đề kiểm tra trắc nghiệm (quiz)
     * @return danh sách các đối tượng phù hợp
     */
    List<QuestionResponse> getByQuizId(Long quizId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuestionResponse create(QuestionRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuestionResponse update(Long id, QuestionRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
