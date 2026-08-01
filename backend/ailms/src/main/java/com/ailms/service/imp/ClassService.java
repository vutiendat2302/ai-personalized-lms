package com.ailms.service.imp;
import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.event.AuditLogEvent;
import com.ailms.repository.specification.ClassSpecification;
import com.ailms.request.ClassSearchRequest;
import com.ailms.request.CreateClassRequest;
import com.ailms.request.UpdateClassRequest;
import com.ailms.service.IClassService;


import com.ailms.entity.ClassEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.ClassMapper;
import com.ailms.mapper.ClassScheduleMapper;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.ClassScheduleRepository;
import com.ailms.response.ClassResponse;
import com.ailms.response.ClassScheduleResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
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
public class ClassService implements IClassService {
    private final ApplicationEventPublisher applicationEventPublisher;

    @Override
    public PageResponse<ClassResponse> search(ClassSearchRequest request) {
        log.info("Searching Class via specification");
        Specification<ClassEntity> spec = ClassSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<ClassEntity> page = classRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(classMapper::toResponse));
    }


    private final ClassRepository classRepository;
    private final CourseRepository courseRepository;
    private final ClassMapper classMapper;
    private final ClassScheduleRepository classScheduleRepository;
    private final ClassScheduleMapper classScheduleMapper;

    private static final String RESOURCE_NAME = "Class";

    public List<ClassResponse> getAll() {
        log.info("Getting all classes");
        return classMapper.toResponseList(classRepository.findAll());
    }

    public ClassResponse getById(Long id) {
        log.info("Getting class by id: {}", id);
        ClassEntity entity = classRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return classMapper.toResponse(entity);
    }

    public List<ClassResponse> getByCourseId(Long courseId) {
        log.info("Getting classes by course id: {}", courseId);
        return classMapper.toResponseList(classRepository.findByCourseEntity_Id(courseId));
    }

    @Override
    public List<ClassScheduleResponse> getSchedules(Long classId) {
        if (!classRepository.existsById(classId)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, classId);
        }
        return classScheduleMapper.toResponseList(classScheduleRepository.findByClassEntity_Id(classId));
    }

    @Transactional
    public ClassResponse create(CreateClassRequest request) {
        log.info("Creating class for course: {}", request.getCourseId());
        CourseEntity course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getCourseId()));

        ClassEntity entity = classMapper.toEntity(request);
        entity.setCourseEntity(course);

        ClassEntity saved = classRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "CLASS", saved.getId(), null, saved));
        return classMapper.toResponse(saved);
    }

    @Transactional
    public ClassResponse update(Long id, UpdateClassRequest request) {
        log.info("Updating class: {}", id);
        ClassEntity existing = classRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        String oldValue = SimpleJsonWriter.toJson(existing);
        classMapper.updateFromRequest(request, existing);

        ClassEntity updated = classRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "CLASS", id, oldValue, updated));
        return classMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting class: {}", id);
        if (!classRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        classRepository.deleteById(id);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "CLASS", id, id, null));
    }
}
