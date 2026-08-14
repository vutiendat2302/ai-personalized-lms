package com.ailms.service;

import com.ailms.entity.*;
import com.ailms.response.NotificationResponse;

import java.util.List;

/** Phát và truy vấn activity notification dành cho Teacher/TA. */
public interface ITeacherActivityService {

    /** Báo cho người dạy khi học viên ACTIVE vừa vào lớp. */
    void studentJoined(ClassMemberEntity member);

    /** Báo cho người dạy khi học viên vừa nộp assignment. */
    void assignmentSubmitted(SubmissionEntity submission, AssignmentEntity assignment);

    /** Báo cho người dạy khi học viên vừa nộp quiz/bài thi. */
    void quizSubmitted(QuizAttemptEntity attempt, QuizEntity quiz);

    /** Báo cho người dạy khi buổi dạy vừa kết thúc. */
    void sessionCompleted(ClassOnlineEntity session);

    /** Ghi nhận chính người dạy vừa hoàn tất nhận xét buổi học. */
    void sessionReviewed(Long reviewerId, ClassOnlineEntity session);

    /** Lấy tối đa năm activity mới nhất để hiển thị dashboard. */
    List<NotificationResponse> getLatest(Long userId, int limit);
}
