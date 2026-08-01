package com.ailms.service.imp;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.ClassEntity;
import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CoursePackageMapper;
import com.ailms.repository.CoursePackageRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.specification.CoursePackageSpecification;
import com.ailms.request.CoursePackageRequest;
import com.ailms.request.CoursePackageSearchRequest;
import com.ailms.response.CoursePackageResponse;
import com.ailms.service.ICoursePackageService;
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
public class CoursePackageService implements ICoursePackageService {

    private final CoursePackageRepository coursePackageRepository;
    private final CourseRepository courseRepository;
    private final ClassRepository classRepository;
    private final CoursePackageMapper coursePackageMapper;

    private static final String RESOURCE_NAME = "CoursePackage";

    @Override
    public PageResponse<CoursePackageResponse> search(CoursePackageSearchRequest request) {
        log.info("Searching Course Packages via specification");
        Specification<CoursePackageEntity> spec = CoursePackageSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<CoursePackageEntity> page = coursePackageRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(coursePackageMapper::toResponse));
    }

    @Override
    public List<CoursePackageResponse> getAll() {
        log.info("Getting all course packages");
        return coursePackageMapper.toResponseList(coursePackageRepository.findAll());
    }

    @Override
    public CoursePackageResponse getById(Long id) {
        log.info("Getting course package by id: {}", id);
        CoursePackageEntity entity = coursePackageRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return coursePackageMapper.toResponse(entity);
    }

    @Override
    public List<CoursePackageResponse> getByCourseId(Long courseId) {
        log.info("Getting course packages by course id: {}", courseId);
        return coursePackageMapper.toResponseList(coursePackageRepository.findByCourseEntity_Id(courseId));
    }

    @Override
    @Transactional
    public CoursePackageResponse create(CoursePackageRequest request) {
        log.info("Creating course package for course: {}", request.getCourseId());
        CourseEntity course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getCourseId()));

        CoursePackageEntity entity = coursePackageMapper.toEntity(request);
        entity.setCourseEntity(course);
        entity.setClassEntity(resolveClass(request, course));

        CoursePackageEntity saved = coursePackageRepository.save(entity);
        return coursePackageMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public CoursePackageResponse update(Long id, CoursePackageRequest request) {
        log.info("Updating course package: {}", id);
        CoursePackageEntity existing = coursePackageRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        CourseEntity course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getCourseId()));

        coursePackageMapper.updateFromRequest(request, existing);
        existing.setCourseEntity(course);
        existing.setClassEntity(resolveClass(request, course));

        CoursePackageEntity updated = coursePackageRepository.save(existing);
        return coursePackageMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting course package: {}", id);
        if (!coursePackageRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        coursePackageRepository.deleteById(id);
    }

    private ClassEntity resolveClass(CoursePackageRequest request, CourseEntity course) {
        if (request.getDeliveryMode() != DeliveryModeEnum.GROUP_CLASS) {
            return null;
        }
        if (request.getClassId() == null) {
            throw new BusinessException("GROUP_CLASS package requires a classId");
        }
        ClassEntity classEntity = classRepository.findById(request.getClassId())
                .orElseThrow(() -> ResourceNotFoundException.of("Class", request.getClassId()));
        if (classEntity.getCourseEntity() == null || !course.getId().equals(classEntity.getCourseEntity().getId())) {
            throw new BusinessException("Selected class does not belong to course " + course.getId());
        }
        return classEntity;
    }
}
