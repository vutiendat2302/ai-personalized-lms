package com.ailms.service;

import com.ailms.dto.GoalProgress;
import com.ailms.request.CreateStudyGoalRequest;
import com.ailms.request.StudyGoalSearchRequest;
import com.ailms.request.UpdateStudyGoalRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.StudyGoalResponse;

import java.util.List;

/**
 * Service thiết lập và đánh giá tiến độ thực hiện mục tiêu học tập cá nhân hóa.
 */
public interface IStudyGoalService {

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<StudyGoalResponse> search(StudyGoalSearchRequest request);

    /**
     * Lấy danh sách tất cả các bản ghi.
     * @return danh sách các đối tượng phù hợp
     */
    List<StudyGoalResponse> getAll();

    /**
     * Lấy thông tin chi tiết của bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    StudyGoalResponse getById(Long id);

    /**
     * Lấy danh sách mục tiêu học tập của học viên.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<StudyGoalResponse> getByUserId(Long userId);

    /**
     * Lấy danh sách mục tiêu học tập theo khóa học.
     *
     * @param courseId ID của khóa học
     * @return danh sách các đối tượng phù hợp
     */
    List<StudyGoalResponse> getByCourseId(Long courseId);

    /**
     * Tạo mới bản ghi từ dữ liệu yêu cầu.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    StudyGoalResponse create(CreateStudyGoalRequest request);

    /**
     * Cập nhật thông tin bản ghi theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    StudyGoalResponse update(Long id, UpdateStudyGoalRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);

    /**
     * Đánh giá mức độ hoàn thành của một mục tiêu học tập cụ thể.
     *
     * @param goalId ID của mục tiêu học tập
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    GoalProgress evaluateGoal(Long goalId);

    /**
     * Đánh giá mức độ hoàn thành của tất cả các mục tiêu học tập của học viên.
     *
     * @param userId ID của người dùng (User)
     * @return danh sách các đối tượng phù hợp
     */
    List<GoalProgress> evaluateUserGoals(Long userId);
}
