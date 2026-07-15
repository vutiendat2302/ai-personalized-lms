package com.ailms.service.imp;
import com.ailms.repository.specification.CourseProgressSpecification;
import com.ailms.request.CourseProgressSearchRequest;
import com.ailms.service.ICourseProgressService;


import com.ailms.entity.CourseProgressEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CourseProgressMapper;
import com.ailms.repository.CourseProgressRepository;
import com.ailms.request.CourseProgressRequest;
import com.ailms.response.CourseProgressResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CourseProgressService implements ICourseProgressService {
    @Override
    public Page<CourseProgressResponse> search(CourseProgressSearchRequest request) {
        log.info("Searching CourseProgress via specification");
        Specification<CourseProgressEntity> spec = CourseProgressSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<CourseProgressEntity> page = courseProgressRepository.findAll(spec, pageable);
        return page.map(courseProgressMapper::toResponse);
    }


    private final CourseProgressRepository courseProgressRepository;
    private final CourseProgressMapper courseProgressMapper;

    private static final String RESOURCE_NAME = "CourseProgress";

    public List<CourseProgressResponse> getAll() {
        log.info("Getting all course progress records");
        return courseProgressMapper.toResponseList(courseProgressRepository.findAll());
    }

    public CourseProgressResponse getById(Long id) {
        log.info("Getting course progress by id: {}", id);
        CourseProgressEntity entity = courseProgressRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return courseProgressMapper.toResponse(entity);
    }

    public List<CourseProgressResponse> getByUserId(Long userId) {
        log.info("Getting course progress by user id: {}", userId);
        return courseProgressMapper.toResponseList(courseProgressRepository.findByUserId(userId));
    }

    public List<CourseProgressResponse> getByCourseId(Long courseId) {
        log.info("Getting course progress by course id: {}", courseId);
        return courseProgressMapper.toResponseList(courseProgressRepository.findByCourseId(courseId));
    }

    public List<CourseProgressResponse> getByEnrollmentId(Long enrollmentId) {
        log.info("Getting course progress by enrollment id: {}", enrollmentId);
        return courseProgressMapper.toResponseList(courseProgressRepository.findByEnrollmentId(enrollmentId));
    }

    @Transactional
    public CourseProgressResponse create(CourseProgressRequest request) {
        log.info("Creating course progress for enrollment: {}", request.getEnrollmentId());
        CourseProgressEntity entity = courseProgressMapper.toEntity(request);
        CourseProgressEntity saved = courseProgressRepository.save(entity);
        return courseProgressMapper.toResponse(saved);
    }

    @Transactional
    public CourseProgressResponse update(Long id, CourseProgressRequest request) {
        log.info("Updating course progress: {}", id);
        CourseProgressEntity existing = courseProgressRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        courseProgressMapper.updateFromRequest(request, existing);
        CourseProgressEntity updated = courseProgressRepository.save(existing);
        return courseProgressMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting course progress: {}", id);
        if (!courseProgressRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        courseProgressRepository.deleteById(id);
    }
}
