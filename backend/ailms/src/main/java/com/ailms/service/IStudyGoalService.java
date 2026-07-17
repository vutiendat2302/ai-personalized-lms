package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.StudyGoalSearchRequest;
import com.ailms.response.StudyGoalResponse;

import com.ailms.entity.StudyGoalEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.StudyGoalMapper;
import com.ailms.repository.StudyGoalRepository;
import com.ailms.request.StudyGoalRequest;
import com.ailms.response.StudyGoalResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
}
