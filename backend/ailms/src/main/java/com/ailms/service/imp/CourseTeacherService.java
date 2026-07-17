package com.ailms.service.imp;
import com.ailms.repository.specification.CourseTeacherSpecification;
import com.ailms.request.CourseTeacherSearchRequest;
import com.ailms.service.ICourseTeacherService;


import com.ailms.entity.CourseEntity;
import com.ailms.entity.CourseTeacherEntity;
import com.ailms.entity.CourseTeacherId;
import com.ailms.entity.UserEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CourseTeacherMapper;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CourseTeacherRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.CourseTeacherRequest;
import com.ailms.response.CourseTeacherResponse;
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
public class CourseTeacherService implements ICourseTeacherService {

    private final CourseTeacherRepository courseTeacherRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final CourseTeacherMapper courseTeacherMapper;

    private static final String RESOURCE_NAME = "CourseTeacher";

    public List<CourseTeacherResponse> getAll() {
        log.info("Getting all course teachers");
        return courseTeacherMapper.toResponseList(courseTeacherRepository.findAll());
    }

    public CourseTeacherResponse getById(Long courseId, Long userId) {
        log.info("Getting course teacher by course id: {}, user id: {}", courseId, userId);
        CourseTeacherEntity entity = courseTeacherRepository.findById(new CourseTeacherId(courseId, userId))
                .orElseThrow(() -> notFound(courseId, userId));
        return courseTeacherMapper.toResponse(entity);
    }

    public List<CourseTeacherResponse> getByCourseId(Long courseId) {
        log.info("Getting teachers by course id: {}", courseId);
        return courseTeacherMapper.toResponseList(courseTeacherRepository.findByCourseEntity_Id(courseId));
    }

    public List<CourseTeacherResponse> getByUserId(Long userId) {
        log.info("Getting course teachers by user id: {}", userId);
        return courseTeacherMapper.toResponseList(courseTeacherRepository.findByUserEntity_Id(userId));
    }

    @Transactional
    public CourseTeacherResponse create(CourseTeacherRequest request) {
        log.info("Creating course teacher for course: {}, user: {}", request.getCourseId(), request.getUserId());
        CourseTeacherId id = new CourseTeacherId(request.getCourseId(), request.getUserId());
        if (courseTeacherRepository.existsById(id)) {
            throw new DuplicateResourceException("Course teacher already exists for course ID "
                    + request.getCourseId() + " and user ID " + request.getUserId());
        }

        CourseTeacherEntity entity = courseTeacherMapper.toEntity(request);
        entity.setId(id);
        applyRelations(entity, request);

        CourseTeacherEntity saved = courseTeacherRepository.save(entity);
        return courseTeacherMapper.toResponse(saved);
    }

    @Transactional
    public CourseTeacherResponse update(Long courseId, Long userId, CourseTeacherRequest request) {
        log.info("Updating course teacher for course: {}, user: {}", courseId, userId);
        CourseTeacherId id = new CourseTeacherId(courseId, userId);
        CourseTeacherEntity existing = courseTeacherRepository.findById(id)
                .orElseThrow(() -> notFound(courseId, userId));

        courseTeacherMapper.updateFromRequest(request, existing);
        existing.setId(id);
        applyRelations(existing, request);

        CourseTeacherEntity updated = courseTeacherRepository.save(existing);
        return courseTeacherMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long courseId, Long userId) {
        log.info("Deleting course teacher for course: {}, user: {}", courseId, userId);
        CourseTeacherId id = new CourseTeacherId(courseId, userId);
        if (!courseTeacherRepository.existsById(id)) {
            throw notFound(courseId, userId);
        }
        courseTeacherRepository.deleteById(id);
    }

    private void applyRelations(CourseTeacherEntity entity, CourseTeacherRequest request) {
        CourseEntity course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getCourseId()));
        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> ResourceNotFoundException.of("User", request.getUserId()));

        entity.setCourseEntity(course);
        entity.setUserEntity(user);
    }

    private ResourceNotFoundException notFound(Long courseId, Long userId) {
        return new ResourceNotFoundException(RESOURCE_NAME + " not found with course ID "
                + courseId + " and user ID " + userId);
    }

    @Override
    public PageResponse<CourseTeacherResponse> search(CourseTeacherSearchRequest request) {
        log.info("Searching CourseTeacher via specification");
        Specification<CourseTeacherEntity> spec = CourseTeacherSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<CourseTeacherEntity> page = courseTeacherRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(courseTeacherMapper::toResponse));
    }
}
