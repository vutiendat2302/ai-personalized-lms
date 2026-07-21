package com.ailms.service;

import com.ailms.dto.GoalProgress;
import com.ailms.request.StudyGoalRequest;
import com.ailms.request.StudyGoalSearchRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.StudyGoalResponse;

import java.util.List;

public interface IStudyGoalService {
    PageResponse<StudyGoalResponse> search(StudyGoalSearchRequest request);

    List<StudyGoalResponse> getAll();

    StudyGoalResponse getById(Long id);

    List<StudyGoalResponse> getByUserId(Long userId);

    List<StudyGoalResponse> getByCourseId(Long courseId);

    StudyGoalResponse create(StudyGoalRequest request);

    StudyGoalResponse update(Long id, StudyGoalRequest request);

    void delete(Long id);

    GoalProgress evaluateGoal(Long goalId);

    List<GoalProgress> evaluateUserGoals(Long userId);
}
