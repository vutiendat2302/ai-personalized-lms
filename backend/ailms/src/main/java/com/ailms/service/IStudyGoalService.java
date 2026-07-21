package com.ailms.service;

import com.ailms.dto.GoalProgress;
import com.ailms.request.CreateStudyGoalRequest;
import com.ailms.request.StudyGoalSearchRequest;
import com.ailms.request.UpdateStudyGoalRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.StudyGoalResponse;

import java.util.List;

public interface IStudyGoalService {
    PageResponse<StudyGoalResponse> search(StudyGoalSearchRequest request);

    List<StudyGoalResponse> getAll();

    StudyGoalResponse getById(Long id);

    List<StudyGoalResponse> getByUserId(Long userId);

    List<StudyGoalResponse> getByCourseId(Long courseId);

    StudyGoalResponse create(CreateStudyGoalRequest request);

    StudyGoalResponse update(Long id, UpdateStudyGoalRequest request);

    void delete(Long id);

    /**
     * Đánh giá tiến độ của một mục tiêu học tập.
     */
    GoalProgress evaluateGoal(Long goalId);

    /**
     * Đánh giá tất cả mục tiêu học tập của người dùng.
     */
    List<GoalProgress> evaluateUserGoals(Long userId);
}
