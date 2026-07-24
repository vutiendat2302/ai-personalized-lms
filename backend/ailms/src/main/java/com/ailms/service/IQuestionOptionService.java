package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.QuestionOptionSearchRequest;
import com.ailms.response.QuestionOptionResponse;

import com.ailms.entity.QuestionOptionEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuestionOptionMapper;
import com.ailms.repository.QuestionOptionRepository;
import com.ailms.request.QuestionOptionRequest;
import com.ailms.response.QuestionOptionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * Service quản lý các phương án lựa chọn (Option) của câu hỏi trắc nghiệm.
 */
public interface IQuestionOptionService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<QuestionOptionResponse> search(QuestionOptionSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<QuestionOptionResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuestionOptionResponse getById(Long id);

    /**
     * Lấy danh sách các tùy chọn đáp án của câu hỏi.
     *
     * @param questionId Tham số questionId
     * @return danh sách các đối tượng phù hợp
     */
    List<QuestionOptionResponse> getByQuestionId(Long questionId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuestionOptionResponse create(QuestionOptionRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    QuestionOptionResponse update(Long id, QuestionOptionRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
