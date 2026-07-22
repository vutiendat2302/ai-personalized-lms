package com.ailms.service.imp;
import com.ailms.repository.specification.LessonProgressSpecification;
import com.ailms.request.LessonProgressSearchRequest;
import com.ailms.service.ILessonProgressService;


import com.ailms.entity.LessonProgressEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.LessonProgressMapper;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.request.LessonProgressRequest;
import com.ailms.response.LessonProgressResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LessonProgressService implements ILessonProgressService {
    @Override
    public PageResponse<LessonProgressResponse> search(LessonProgressSearchRequest request) {
        log.info("Searching LessonProgress via specification");
        Specification<LessonProgressEntity> spec = LessonProgressSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<LessonProgressEntity> page = lessonProgressRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(lessonProgressMapper::toResponse));
    }


    private final LessonProgressRepository lessonProgressRepository;
    private final LessonProgressMapper lessonProgressMapper;

    private static final String RESOURCE_NAME = "LessonProgress";

    public List<LessonProgressResponse> getAll() {
        log.info("Getting all lesson progress records");
        return lessonProgressMapper.toResponseList(lessonProgressRepository.findAll());
    }

    public LessonProgressResponse getById(Long id) {
        log.info("Getting lesson progress by id: {}", id);
        LessonProgressEntity entity = lessonProgressRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return lessonProgressMapper.toResponse(entity);
    }

    public List<LessonProgressResponse> getByUserId(Long userId) {
        log.info("Getting lesson progress by user id: {}", userId);
        return lessonProgressMapper.toResponseList(lessonProgressRepository.findByUserId(userId));
    }

    public List<LessonProgressResponse> getByLessonId(Long lessonId) {
        log.info("Getting lesson progress by lesson id: {}", lessonId);
        return lessonProgressMapper.toResponseList(lessonProgressRepository.findByLessonId(lessonId));
    }

    public List<LessonProgressResponse> getByEnrollmentId(Long enrollmentId) {
        log.info("Getting lesson progress by enrollment id: {}", enrollmentId);
        return lessonProgressMapper.toResponseList(lessonProgressRepository.findByEnrollmentId(enrollmentId));
    }

    @Transactional
    public LessonProgressResponse create(LessonProgressRequest request) {
        log.info("Creating lesson progress for lesson: {}", request.getLessonId());
        LessonProgressEntity entity = lessonProgressMapper.toEntity(request);
        LessonProgressEntity saved = lessonProgressRepository.save(entity);
        return lessonProgressMapper.toResponse(saved);
    }

    @Transactional
    public LessonProgressResponse update(Long id, LessonProgressRequest request) {
        log.info("Updating lesson progress: {}", id);
        LessonProgressEntity existing = lessonProgressRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        lessonProgressMapper.updateFromRequest(request, existing);
        LessonProgressEntity updated = lessonProgressRepository.save(existing);
        return lessonProgressMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting lesson progress: {}", id);
        if (!lessonProgressRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        lessonProgressRepository.deleteById(id);
    }
}
