package com.ailms.service;

import com.ailms.request.TeacherWorkspaceRequest;
import com.ailms.response.TeacherWorkspaceResponse;

import java.time.LocalDate;
import java.util.List;

/** Nghiệp vụ dashboard, lịch dạy, chấm bài và yêu cầu của giáo viên/trợ giảng. */
public interface ITeacherWorkspaceService {

    /** Tổng hợp chỉ số dashboard từ dữ liệu thuộc phạm vi người dạy. */
    TeacherWorkspaceResponse.Metrics getMetrics(Long userId);

    /** Lấy lịch hôm nay và buổi vừa kết thúc chưa nhận xét. */
    List<TeacherWorkspaceResponse.AgendaSession> getAgenda(Long userId);

    /** Lấy lịch online trong khoảng ngày phục vụ chế độ tuần/tháng. */
    List<TeacherWorkspaceResponse.OnlineSession> getOnlineSessions(Long userId, LocalDate from, LocalDate to);

    /** Lưu nhận xét của buổi học sau khi xác minh quyền và thời điểm. */
    void reviewSession(Long userId, Long sessionId, TeacherWorkspaceRequest.SessionReview request);

    /** Lấy bài assignment chưa chấm trong phạm vi lớp/khóa học phụ trách. */
    List<TeacherWorkspaceResponse.SubmissionQueueItem> getPendingSubmissions(Long userId);

    /** Chấm bài assignment sau khi xác minh quyền quản lý. */
    void gradeSubmission(Long userId, Long submissionId, TeacherWorkspaceRequest.SubmissionGrade request);

    /** Lấy các câu tự luận quiz chưa được chấm. */
    List<TeacherWorkspaceResponse.FillBlankQueueItem> getPendingQuizAnswers(Long userId);

    /** Chấm một câu tự luận và kết toán attempt khi đã chấm đủ. */
    void gradeQuizAnswer(Long userId, Long answerId, TeacherWorkspaceRequest.AnswerGrade request);

    /** Tính tỷ lệ sai theo câu hỏi của các quiz được quản lý. */
    List<TeacherWorkspaceResponse.QuestionDifficulty> getQuestionDifficulty(Long userId);

    /** Lấy quiz, bài thi và assignment do chính user tạo. */
    List<TeacherWorkspaceResponse.AuthoredAssessment> getAuthoredAssessments(Long userId, String type);

    /** Tạo yêu cầu tổng quát gửi HR/Admin. */
    TeacherWorkspaceResponse.WorkRequest createWorkRequest(Long userId, TeacherWorkspaceRequest.WorkRequestCreate request);

    /** Lấy lịch sử yêu cầu do chính user tạo. */
    List<TeacherWorkspaceResponse.WorkRequest> getWorkRequests(Long userId);

    /** Tạo yêu cầu chuyển lớp/phân công sau khi kiểm tra hai lớp. */
    TeacherWorkspaceResponse.WorkRequest createClassTransfer(Long userId, TeacherWorkspaceRequest.ClassTransferCreate request);

    /** Tạo yêu cầu rời lớp nếu số buổi đã hoàn thành còn dưới ngưỡng 30%. */
    TeacherWorkspaceResponse.WorkRequest createClassWithdrawal(
            Long userId, TeacherWorkspaceRequest.ClassWithdrawalCreate request);

    /** Tạo đơn nghỉ phép bằng employee lấy từ JWT. */
    TeacherWorkspaceResponse.LeaveRequestItem createLeave(Long userId, TeacherWorkspaceRequest.LeaveCreate request);

    /** Lấy đơn nghỉ phép của chính người dạy. */
    List<TeacherWorkspaceResponse.LeaveRequestItem> getLeaves(Long userId);

    /** Hủy đơn nghỉ thuộc chính người dạy hiện tại. */
    void cancelLeave(Long userId, Long leaveRequestId);

    /** Kiểm tra người dạy đã được gán chuyên môn. */
    boolean hasAssignedCategory(Long userId);

    /** Lấy các lớp người dạy là thành viên ACTIVE. */
    List<TeacherWorkspaceResponse.ClassCard> getClasses(Long userId);

    /** Lấy học viên cùng tín hiệu rủi ro của lớp được quản lý. */
    List<TeacherWorkspaceResponse.StudentRisk> getClassStudents(Long userId, Long classId);

    /** Gửi thông báo nhắc học tới học viên thuộc lớp được quản lý. */
    void sendStudentReminder(Long userId, Long studentId);

    /** Lấy các khoản thù lao theo từng buổi dạy. */
    List<TeacherWorkspaceResponse.EarningItem> getEarnings(Long userId);
}
