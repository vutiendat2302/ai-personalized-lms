package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.StudentProgressReportResponse;
import com.ailms.response.SystemDashboardResponse;

import java.util.List;

/**
 * Service quản lý đánh giá học tập, bao gồm tính toán tiến độ khóa học, làm bài trắc nghiệm (quiz), nộp bài tập tự luận (assignment) và báo cáo tiến độ học tập.
 */
public interface IAssessmentService {

    /**
     * Tính toán lại tiến độ khóa học của học viên dựa trên kết quả bài học.
     *
     * @param enrollmentId ID của lượt đăng ký học
     */
    void recomputeCourseProgress(Long enrollmentId);

    /**
     * Bắt đầu một lượt làm bài trắc nghiệm (quiz).
     *
     * @param userId ID của người dùng (User)
     * @param quizId ID của đề kiểm tra trắc nghiệm (quiz)
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    Long startQuizAttempt(Long userId, Long quizId);

    /**
     * Nộp bài làm trắc nghiệm.
     *
     * @param attemptId ID của lượt làm bài kiểm tra trắc nghiệm
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void submitQuizAttempt(Long attemptId, SubmitQuizAttemptRequest request);

    /**
     * Chấm điểm thủ công cho câu hỏi điền vào chỗ trống.
     *
     * @param attemptId ID của lượt làm bài kiểm tra trắc nghiệm
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void gradeFillInTheBlank(Long attemptId, GradeFillInBlankRequest request);

    /**
     * Quét và tự động thu hồi/nộp các bài quiz đã quá giờ làm bài.
     */
    void sweepExpiredQuizAttempts();

    /**
     * Tạo mới bài tập về nhà tự luận.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    Long createAssignment(CreateAssignmentRequest request);

    /**
     * Học viên nộp bài làm cho bài tập tự luận.
     *
     * @param userId ID của người dùng (User)
     * @param assignmentId ID của bài tập tự luận
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    Long submitAssignment(Long userId, Long assignmentId, SubmitAssignmentRequest request);

    /**
     * Giáo viên chấm điểm và nhận xét bài nộp tự luận của học viên.
     *
     * @param submissionId ID của bài nộp tự luận
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @param teacherUserId ID của người dùng đóng vai trò giáo viên
     */
    void gradeSubmission(Long submissionId, GradeSubmissionRequest request, Long teacherUserId);

    /**
     * Lấy báo cáo tiến độ học tập của toàn bộ lớp học.
     *
     * @param classId ID của lớp học
     * @param teacherUserId ID của người dùng đóng vai trò giáo viên
     * @return danh sách các đối tượng phù hợp
     */
    List<StudentProgressReportResponse> getClassProgressReport(Long classId, Long teacherUserId);

    /**
     * Lấy dữ liệu báo cáo tổng quan hệ thống theo danh mục.
     *
     * @param categoryId ID của danh mục khóa học
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    SystemDashboardResponse getSystemDashboardReport(Long categoryId);
}
