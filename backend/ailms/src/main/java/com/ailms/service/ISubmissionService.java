package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.SubmissionSearchRequest;
import com.ailms.response.SubmissionResponse;


import com.ailms.entity.SubmissionEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.SubmissionMapper;
import com.ailms.repository.FileMetadataRepository;
import com.ailms.repository.SubmissionRepository;
import com.ailms.request.SubmissionRequest;
import com.ailms.response.SubmissionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * Service quản lý bài nộp bài tập tự luận của học viên.
 */
public interface ISubmissionService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<SubmissionResponse> search(SubmissionSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<SubmissionResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    SubmissionResponse getById(Long id);

    /**
     * Lấy danh sách bài nộp của học viên theo bài tập tự luận.
     *
     * @param assignmentId ID của bài tập tự luận
     * @return danh sách các đối tượng phù hợp
     */
    List<SubmissionResponse> getByAssignmentId(Long assignmentId);

    /**
     * Lấy danh sách bài nộp của một học viên cụ thể.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<SubmissionResponse> getByUserId(Long userId);

    /**
     * Lấy danh sách bài nộp của một lượt đăng ký học cụ thể.
     *
     * @param enrollmentId ID của lượt đăng ký học
     * @return danh sách các đối tượng phù hợp
     */
    List<SubmissionResponse> getByEnrollmentId(Long enrollmentId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    SubmissionResponse create(SubmissionRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    SubmissionResponse update(Long id, SubmissionRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);
}
