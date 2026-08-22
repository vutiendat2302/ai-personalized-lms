package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.*;

import java.util.List;

/**
 * Service interface dành cho quản trị tác giả khóa học (Course Authoring Studio).
 */
public interface ICourseAuthoringService {

    /**
     * Lấy cây nội dung chương bài học (Curriculum Tree 3 cấp) phục vụ Course Builder.
     */
    CourseCurriculumResponse getCurriculum(Long courseId);

    /** Lấy curriculum phục vụ học tập nhưng không làm lộ đáp án đúng của quiz. */
    CourseCurriculumResponse getLearningCurriculum(Long courseId);

    /**
     * Thêm chương học mới vào khóa học.
     */
    SectionResponse addSection(Long courseId, CreateSectionRequest request);

    /**
     * Cập nhật thông tin chương học.
     */
    SectionResponse updateSection(Long sectionId, UpdateSectionRequest request);

    /**
     * Xóa chương học (chặn nếu còn bài học active).
     */
    void deleteSection(Long sectionId);

    /**
     * Sắp xếp lại thứ tự các chương học trong khóa.
     */
    void reorderSections(Long courseId, ReorderRequest request);

    /**
     * Thêm bài học mới trong chương.
     */
    LessonResponse addLesson(Long sectionId, CreateLessonRequest request);

    /**
     * Cập nhật thông tin bài học (autosave).
     */
    LessonResponse updateLesson(Long lessonId, UpdateLessonRequest request);

    /**
     * Xóa hoặc ẩn bài học (Soft-delete nếu học viên đã có tiến độ).
     */
    void deleteLesson(Long lessonId);

    /**
     * Sắp xếp bài học (hỗ trợ chuyển sang chương khác qua targetSectionId).
     */
    void reorderLessons(Long sectionId, ReorderRequest request);

    /**
     * Tạo bài kiểm tra trắc nghiệm Quiz (3 cấp).
     */
    QuizResponse createQuiz(QuizRequest request);

    /**
     * Cập nhật bài kiểm tra Quiz.
     */
    QuizResponse updateQuiz(Long quizId, QuizRequest request);

    /**
     * Tạo bài tập tự luận Assignment (3 cấp).
     */
    AssignmentResponse createAssignment(CreateAssignmentRequest request);

    /**
     * Cập nhật bài tập tự luận Assignment.
     */
    AssignmentResponse updateAssignment(Long assignmentId, AssignmentRequest request);

    /**
     * Gửi duyệt khóa học (DRAFT/REJECTED -> PENDING). Chỉ dành cho người tạo khóa học.
     */
    CourseResponse submitForReview(Long courseId);

    /**
     * Hủy yêu cầu gửi duyệt khóa học (PENDING -> DRAFT). Chỉ dành cho người tạo khóa học.
     */
    CourseResponse cancelReviewRequest(Long courseId);

    /**
     * Chuyển khóa học ACTIVE về chế độ chỉnh sửa (ACTIVE -> DRAFT & tự động ẩn các gói bán). Chỉ dành cho người tạo khóa học.
     */
    CourseResponse requestEditActiveCourse(Long courseId);

    /**
     * Mời giảng viên phụ trách khóa học (qua Email hoặc trực tiếp chọn từ danh sách hệ thống).
     */
    CourseInstructorResponse inviteInstructor(Long courseId, InviteInstructorRequest request);

    /**
     * Tìm kiếm giảng viên trong hệ thống (Hỗ trợ tìm theo Tên, Mã nhân viên, Phòng ban, Email).
     */
    List<TeacherOptionResponse> searchTeachers(String query);

    /**
     * Lấy danh sách giảng viên phụ trách của khóa học.
     */
    List<CourseInstructorResponse> getCourseInstructors(Long courseId);

    /**
     * Xóa giảng viên phụ trách khỏi khóa học. Chỉ dành cho người tạo khóa học.
     */
    void removeInstructor(Long courseId, Long instructorId);

    /**
     * Giảng viên phản hồi lời mời phụ trách khóa học (Đồng ý / Từ chối).
     */
    CourseInstructorResponse respondInvitation(Long invitationId, boolean accept);

    /**
     * Lấy danh sách lời mời phụ trách khóa học của giảng viên đang đăng nhập.
     */
    List<CourseInstructorResponse> getMyInvitations();

    /**
     * Lấy danh sách bài nộp Assignment để chấm.
     */
    List<SubmissionResponse> getSubmissionsForGrading(Long assignmentId);

    /**
     * Chấm điểm bài nộp Assignment từ Giảng viên.
     */
    SubmissionResponse gradeSubmission(Long submissionId, GradeSubmissionWithFeedbackRequest request);
}
