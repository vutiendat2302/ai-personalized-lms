package com.ailms.service.imp;
import com.ailms.repository.specification.CourseSectionSpecification;
import com.ailms.request.*;
import com.ailms.service.ICourseSectionService;


import com.ailms.entity.CategoryEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.CourseSectionEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CourseSectionMapper;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CourseSectionRepository;
import com.ailms.response.CourseResponse;
import com.ailms.response.SectionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CourseSectionService implements ICourseSectionService {

    private final CourseSectionRepository courseSectionRepository;
    private final CourseRepository courseRepository;
    private final CourseSectionMapper courseSectionMapper;
    private static final String RESOURCE_NAME = "Course Section";

    @Override
    @Transactional
    public SectionResponse create(CreateSectionRequest request) {
        log.info("Creating section for course id: {}", request.getCourseId());

        if (courseSectionRepository.existsByNameAndCourseEntity_Id(request.getName(), request.getCourseId())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "name and courseId", request.getName() + " in course " + request.getCourseId());
        }
        
        CourseEntity course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, request.getCourseId()));

        CourseSectionEntity entity = courseSectionMapper.toEntity(request);
        entity.setCourseEntity(course);

        if (request.getOrderIndex() == null) {
            int currentCount = courseSectionRepository.countByCourseEntityId(request.getCourseId());
            entity.setOrderIndex(currentCount);
        }

        CourseSectionEntity savedEntity = courseSectionRepository.save(entity);
        // Trigger metadata recalculation

        return courseSectionMapper.toResponse(savedEntity);
    }

    @Override
    @Transactional
    public SectionResponse update(Long id, UpdateSectionRequest request) {
        log.info("Updating section with id: {}", id);

        CourseSectionEntity existingEntity = courseSectionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        CourseEntity courseEntity = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ResourceNotFoundException.of("Course Entity", request.getCourseId()));

        courseSectionMapper.updateEntityFromRequest(request, existingEntity);
        existingEntity.setCourseEntity(courseEntity);

        CourseSectionEntity updatedEntity = courseSectionRepository.save(existingEntity);

        return courseSectionMapper.toResponse(updatedEntity);
    }


    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting section with id: {}", id);

        CourseSectionEntity existingEntity = courseSectionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        courseSectionRepository.delete(existingEntity);
    }

    @Override
    public List<SectionResponse> getSectionsByCourseId(Long courseId) {
        log.info("Getting sections for course id: {}", courseId);
        
        if (!courseRepository.existsById(courseId)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, courseId);
        }

        // We can fetch sections ordered by orderIndex
        // The relationship sections in CourseEntity is @OrderBy("orderIndex ASC")
        CourseEntity course = courseRepository.findById(courseId).orElseThrow();
        return course.getSections().stream()
                .map(courseSectionMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void reorder(ReorderRequest request) {
        log.info("Reordering sections");
        List<Long> ids = request.getIds();
        for (int i = 0; i < ids.size(); i++) {
            Long id = ids.get(i);
            CourseSectionEntity section = courseSectionRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + id));
            section.setOrderIndex(i);
            courseSectionRepository.save(section);
        }
    }

    @Override
    public SectionResponse getById(Long id) {
        CourseSectionEntity courseSectionEntity = courseSectionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        return courseSectionMapper.toResponse(courseSectionEntity);
    }

    @Override
    public List<SectionResponse> getAll() {
        return courseSectionRepository.findAll()
                .stream()
                .map(courseSectionMapper::toResponse)
                .toList();
    }

    @Override
    public PageResponse<SectionResponse> search(CourseSectionSearchRequest request) {
        log.info("Searching CourseSection via specification");
        Specification<CourseSectionEntity> spec = CourseSectionSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<CourseSectionEntity> page = courseSectionRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(courseSectionMapper::toResponse));
    }
}
