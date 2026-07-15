package com.ailms.service.imp;
import com.ailms.repository.specification.LessonSpecification;
import com.ailms.request.LessonSearchRequest;
import com.ailms.service.ILessonService;


import com.ailms.entity.CourseSectionEntity;
import com.ailms.entity.LessonEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.LessonMapper;
import com.ailms.repository.CourseSectionRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.request.CreateLessonRequest;
import com.ailms.request.UpdateLessonRequest;
import com.ailms.request.ReorderRequest;
import com.ailms.response.LessonResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonService implements ILessonService {
    @Override
    public Page<LessonResponse> search(LessonSearchRequest request) {
        log.info("Searching Lesson via specification");
        Specification<LessonEntity> spec = LessonSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<LessonEntity> page = lessonRepository.findAll(spec, pageable);
        return page.map(lessonMapper::toResponse);
    }


    private final LessonRepository lessonRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final LessonMapper lessonMapper;

    @Override
    @Transactional
    public LessonResponse create(Long sectionId, CreateLessonRequest request) {
        log.info("Creating lesson for section id: {}", sectionId);

        CourseSectionEntity section = courseSectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + sectionId));

        LessonEntity entity = lessonMapper.toEntity(request);
        entity.setCourseSectionEntity(section);

        if (request.getOrderIndex() == null) {
            int currentCount = lessonRepository.countByCourseSectionEntityId(sectionId);
            entity.setOrderIndex(currentCount);
        }

        LessonEntity savedEntity = lessonRepository.save(entity);

        // Recalculate metadata

        return lessonMapper.toResponse(savedEntity);
    }

    @Override
    @Transactional
    public LessonResponse update(Long id, UpdateLessonRequest request) {
        log.info("Updating lesson with id: {}", id);

        LessonEntity existingEntity = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with id: " + id));

        int oldDuration = existingEntity.getDurationMin() != null ? existingEntity.getDurationMin() : 0;
        int newDuration = request.getDurationMin() != null ? request.getDurationMin() : 0;

        lessonMapper.updateEntityFromRequest(request, existingEntity);
        LessonEntity updatedEntity = lessonRepository.save(existingEntity);


        return lessonMapper.toResponse(updatedEntity);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting lesson with id: {}", id);

        LessonEntity existingEntity = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with id: " + id));

        Long courseId = existingEntity.getCourseSectionEntity().getCourseEntity().getId();
        lessonRepository.delete(existingEntity);

    }

    @Override
    public LessonResponse getById(Long id) {
        log.info("Getting lesson by id: {}", id);

        LessonEntity entity = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with id: " + id));

        return lessonMapper.toResponse(entity);
    }

    @Override
    public List<LessonResponse> getLessonsBySectionId(Long sectionId) {
        log.info("Getting lessons for section id: {}", sectionId);

        CourseSectionEntity section = courseSectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + sectionId));

        return section.getLessonEntities().stream()
                .map(lessonMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void reorder(ReorderRequest request) {
        log.info("Reordering lessons");
        List<Long> ids = request.getIds();
        for (int i = 0; i < ids.size(); i++) {
            Long id = ids.get(i);
            LessonEntity lesson = lessonRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with id: " + id));
            lesson.setOrderIndex(i);
            lessonRepository.save(lesson);
        }
    }
}
