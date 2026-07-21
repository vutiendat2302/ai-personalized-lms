package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.StudentProgressReportResponse;
import com.ailms.response.SystemDashboardResponse;

import java.util.List;

public interface IAssessmentService {

    void recomputeCourseProgress(Long enrollmentId);

    Long startQuizAttempt(Long userId, Long quizId);

    void submitQuizAttempt(Long attemptId, SubmitQuizAttemptRequest request);

    void gradeFillInTheBlank(Long attemptId, GradeFillInBlankRequest request);

    void sweepExpiredQuizAttempts();

    Long createAssignment(CreateAssignmentRequest request);

    Long submitAssignment(Long userId, Long assignmentId, SubmitAssignmentRequest request);

    void gradeSubmission(Long submissionId, GradeSubmissionRequest request, Long teacherUserId);

    List<StudentProgressReportResponse> getClassProgressReport(Long classId, Long teacherUserId);

    SystemDashboardResponse getSystemDashboardReport(Long categoryId);
}
