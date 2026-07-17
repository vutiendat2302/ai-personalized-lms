package com.ailms.service.imp;
import com.ailms.repository.specification.ClassSpecification;
import com.ailms.request.ClassSearchRequest;
import com.ailms.service.IClassService;


import com.ailms.entity.ClassEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.ClassMapper;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.request.ClassRequest;
import com.ailms.response.ClassResponse;
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
public class ClassService implements IClassService {
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

    @Transactional
    public ClassResponse create(ClassRequest request) {
        log.info("Creating class for course: {}", request.getCourseId());
        CourseEntity course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getCourseId()));

        ClassEntity entity = classMapper.toEntity(request);
        entity.setCourseEntity(course);

        ClassEntity saved = classRepository.save(entity);
        return classMapper.toResponse(saved);
    }

    @Transactional
    public ClassResponse update(Long id, ClassRequest request) {
        log.info("Updating class: {}", id);
        ClassEntity existing = classRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        CourseEntity course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getCourseId()));

        classMapper.updateFromRequest(request, existing);
        existing.setCourseEntity(course);

        ClassEntity updated = classRepository.save(existing);
        return classMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting class: {}", id);
        if (!classRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        classRepository.deleteById(id);
    }
}
