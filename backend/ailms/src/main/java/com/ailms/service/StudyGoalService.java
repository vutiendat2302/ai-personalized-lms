package com.ailms.service;

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

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StudyGoalService {

    private final StudyGoalRepository studyGoalRepository;
    private final StudyGoalMapper studyGoalMapper;

    private static final String RESOURCE_NAME = "StudyGoal";

    public List<StudyGoalResponse> getAll() {
        log.info("Getting all study goals");
        return studyGoalMapper.toResponseList(studyGoalRepository.findAll());
    }

    public StudyGoalResponse getById(Long id) {
        log.info("Getting study goal by id: {}", id);
        StudyGoalEntity entity = studyGoalRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return studyGoalMapper.toResponse(entity);
    }

    public List<StudyGoalResponse> getByUserId(Long userId) {
        log.info("Getting study goals by user id: {}", userId);
        return studyGoalMapper.toResponseList(studyGoalRepository.findByUserId(userId));
    }

    public List<StudyGoalResponse> getByCourseId(Long courseId) {
        log.info("Getting study goals by course id: {}", courseId);
        return studyGoalMapper.toResponseList(studyGoalRepository.findByCourseId(courseId));
    }

    @Transactional
    public StudyGoalResponse create(StudyGoalRequest request) {
        log.info("Creating study goal for user: {}", request.getUserId());
        StudyGoalEntity entity = studyGoalMapper.toEntity(request);
        StudyGoalEntity saved = studyGoalRepository.save(entity);
        return studyGoalMapper.toResponse(saved);
    }

    @Transactional
    public StudyGoalResponse update(Long id, StudyGoalRequest request) {
        log.info("Updating study goal: {}", id);
        StudyGoalEntity existing = studyGoalRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        studyGoalMapper.updateFromRequest(request, existing);
        StudyGoalEntity updated = studyGoalRepository.save(existing);
        return studyGoalMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting study goal: {}", id);
        if (!studyGoalRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        studyGoalRepository.deleteById(id);
    }
}
