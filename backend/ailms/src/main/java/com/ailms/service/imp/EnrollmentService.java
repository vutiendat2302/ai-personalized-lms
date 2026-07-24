package com.ailms.service.imp;
import com.ailms.repository.specification.EnrollmentSpecification;
import com.ailms.request.EnrollmentSearchRequest;
import com.ailms.service.IEnrollmentService;


import com.ailms.entity.ClassEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.UserEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.EnrollmentMapper;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.EnrollmentRequest;
import com.ailms.response.EnrollmentResponse;
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
public class EnrollmentService implements IEnrollmentService {
    @Override
    public PageResponse<EnrollmentResponse> search(EnrollmentSearchRequest request) {
        log.info("Searching Enrollment via specification");
        Specification<EnrollmentEntity> spec = EnrollmentSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<EnrollmentEntity> page = enrollmentRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(enrollmentMapper::toResponse));
    }


    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final ClassRepository classRepository;
    private final EnrollmentMapper enrollmentMapper;

    private static final String RESOURCE_NAME = "Enrollment";

    public List<EnrollmentResponse> getAll() {
        log.info("Getting all enrollments");
        return enrollmentMapper.toResponseList(enrollmentRepository.findAll());
    }

    public EnrollmentResponse getById(Long id) {
        log.info("Getting enrollment by id: {}", id);
        EnrollmentEntity entity = enrollmentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return enrollmentMapper.toResponse(entity);
    }

    public List<EnrollmentResponse> getByUserId(Long userId) {
        log.info("Getting enrollments by user id: {}", userId);
        return enrollmentMapper.toResponseList(enrollmentRepository.findByUserEntity_Id(userId));
    }

    public List<EnrollmentResponse> getByCourseId(Long courseId) {
        log.info("Getting enrollments by course id: {}", courseId);
        return enrollmentMapper.toResponseList(enrollmentRepository.findByCourseEntity_Id(courseId));
    }

    public List<EnrollmentResponse> getByClassId(Long classId) {
        log.info("Getting enrollments by class id: {}", classId);
        return enrollmentMapper.toResponseList(enrollmentRepository.findByClassEntity_Id(classId));
    }

    @Transactional
    public EnrollmentResponse create(EnrollmentRequest request) {
        log.info("Creating enrollment for user: {}", request.getUserId());
        EnrollmentEntity entity = enrollmentMapper.toEntity(request);
        applyRelations(entity, request);

        EnrollmentEntity saved = enrollmentRepository.save(entity);

        // Update enrollmentCount on CourseEntity
        CourseEntity course = saved.getCourseEntity();
        if (course != null) {
            course.setEnrollmentCount((course.getEnrollmentCount() != null ? course.getEnrollmentCount() : 0) + 1);
            courseRepository.save(course);
        }

        return enrollmentMapper.toResponse(saved);
    }

    @Transactional
    public EnrollmentResponse update(Long id, EnrollmentRequest request) {
        log.info("Updating enrollment: {}", id);
        EnrollmentEntity existing = enrollmentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        enrollmentMapper.updateFromRequest(request, existing);
        applyRelations(existing, request);

        EnrollmentEntity updated = enrollmentRepository.save(existing);
        return enrollmentMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting enrollment: {}", id);
        EnrollmentEntity existing = enrollmentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        enrollmentRepository.delete(existing);

        // Update enrollmentCount on CourseEntity
        CourseEntity course = existing.getCourseEntity();
        if (course != null) {
            int current = course.getEnrollmentCount() != null ? course.getEnrollmentCount() : 0;
            course.setEnrollmentCount(Math.max(0, current - 1));
            courseRepository.save(course);
        }
    }

    private void applyRelations(EnrollmentEntity entity, EnrollmentRequest request) {
        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> ResourceNotFoundException.of("User", request.getUserId()));
        CourseEntity course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getCourseId()));

        ClassEntity classEntity = null;
        if (request.getClassId() != null) {
            classEntity = classRepository.findById(request.getClassId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Class", request.getClassId()));
        }

        entity.setUserEntity(user);
        entity.setCourseEntity(course);
        entity.setClassEntity(classEntity);
    }
}
