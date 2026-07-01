package com.ailms.service;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.CourseSectionEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CourseSectionMapper;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CourseSectionRepository;
import com.ailms.request.CreateSectionRequest;
import com.ailms.request.UpdateSectionRequest;
import com.ailms.request.ReorderRequest;
import com.ailms.response.SectionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseSectionService implements ICourseSectionService {

    private final CourseSectionRepository courseSectionRepository;
    private final CourseRepository courseRepository;
    private final CourseSectionMapper courseSectionMapper;

    @Override
    @Transactional
    public SectionResponse create(Long courseId, CreateSectionRequest request) {
        log.info("Creating section for course id: {}", courseId);
        
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));

        CourseSectionEntity entity = courseSectionMapper.toEntity(request);
        entity.setCourseEntity(course);

        if (request.getOrderIndex() == null) {
            int currentCount = courseSectionRepository.countByCourseEntityId(courseId);
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
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + id));

        courseSectionMapper.updateEntityFromRequest(request, existingEntity);
        CourseSectionEntity updatedEntity = courseSectionRepository.save(existingEntity);

        return courseSectionMapper.toResponse(updatedEntity);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting section with id: {}", id);

        CourseSectionEntity existingEntity = courseSectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + id));

        Long courseId = existingEntity.getCourseEntity().getId();
        courseSectionRepository.delete(existingEntity);


    }

    @Override
    public List<SectionResponse> getSectionsByCourseId(Long courseId) {
        log.info("Getting sections for course id: {}", courseId);
        
        if (!courseRepository.existsById(courseId)) {
            throw new ResourceNotFoundException("Course not found with id: " + courseId);
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
}
