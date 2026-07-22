package com.ailms.service.imp;

import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.entity.CourseSectionEntity;
import com.ailms.entity.LessonEntity;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.LessonMapper;
import com.ailms.repository.CourseSectionRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.repository.specification.LessonSpecification;
import com.ailms.request.CreateLessonRequest;
import com.ailms.request.LessonSearchRequest;
import com.ailms.request.ReorderRequest;
import com.ailms.request.UpdateLessonRequest;
import com.ailms.response.LessonPreviewResponse;
import com.ailms.response.LessonResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.ILessonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import com.ailms.entity.enums.PreviewTypeEnum;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LessonService implements ILessonService {

    private final LessonRepository lessonRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonMapper lessonMapper;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Override
    public PageResponse<LessonResponse> search(LessonSearchRequest request) {
        log.info("Searching Lesson via specification");
        Specification<LessonEntity> spec = LessonSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<LessonEntity> page = lessonRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(lessonMapper::toResponse));
    }

    @Override
    @Transactional
    public LessonResponse create(CreateLessonRequest request) {
        log.info("Creating lesson for section id: {}", request.getSectionId());

        CourseSectionEntity section = courseSectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + request.getSectionId()));

        LessonEntity entity = lessonMapper.toEntity(request);
        entity.setCourseSectionEntity(section);

        if (request.getOrderIndex() == null) {
            int currentCount = lessonRepository.countByCourseSectionEntityId(request.getSectionId());
            entity.setOrderIndex(currentCount);
        }

        LessonEntity savedEntity = lessonRepository.save(entity);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "LESSON", savedEntity.getId(), null, savedEntity));
        return lessonMapper.toResponse(savedEntity);
    }

    @Override
    @Transactional
    public LessonResponse update(Long id, UpdateLessonRequest request) {
        log.info("Updating lesson with id: {}", id);

        LessonEntity existingEntity = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with id: " + id));
        String oldValue = SimpleJsonWriter.toJson(existingEntity);

        lessonMapper.updateEntityFromRequest(request, existingEntity);
        LessonEntity updatedEntity = lessonRepository.save(existingEntity);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "LESSON", id, oldValue, existingEntity));
        return lessonMapper.toResponse(updatedEntity);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting lesson with id: {}", id);

        LessonEntity existingEntity = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with id: " + id));
        String oldValue = SimpleJsonWriter.toJson(existingEntity);
        lessonRepository.delete(existingEntity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "LESSON", id, oldValue, null));
    }

    @Override
    public LessonResponse getById(Long id) {
        log.info("Getting lesson by id: {}", id);

        LessonEntity entity = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with id: " + id));

        return lessonMapper.toResponse(entity);
    }

    @Override
    public LessonPreviewResponse getLessonWithPreview(Long id, Long currentUserId) {
        log.info("Getting lesson preview for lessonId: {}, userId: {}", id, currentUserId);

        LessonEntity lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with id: " + id));

        PreviewTypeEnum previewType = lesson.getPreviewType();

        if (PreviewTypeEnum.FREE == previewType) {
            return LessonPreviewResponse.builder()
                    .id(lesson.getId())
                    .name(lesson.getName())
                    .contentType(lesson.getContentType())
                    .description(lesson.getDescription())
                    .durationMin(lesson.getDurationMin())
                    .previewType("FREE")
                    .locked(false)
                    .contentUrl(lesson.getContentUrl())
                    .ctaUrl(null)
                    .build();
        }

        // Preview type is LOCKED
        if (currentUserId == null) {
            return LessonPreviewResponse.builder()
                    .id(lesson.getId())
                    .name(lesson.getName())
                    .contentType(lesson.getContentType())
                    .description(lesson.getDescription())
                    .durationMin(lesson.getDurationMin())
                    .previewType("LOCKED")
                    .locked(true)
                    .contentUrl(null)
                    .ctaUrl("/login?redirect=/lessons/" + id)
                    .build();
        }

        Long courseId = lesson.getCourseSectionEntity() != null && lesson.getCourseSectionEntity().getCourseEntity() != null
                ? lesson.getCourseSectionEntity().getCourseEntity().getId()
                : null;

        boolean isEnrolled = courseId != null && enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(currentUserId, courseId).isPresent();

        if (isEnrolled) {
            return LessonPreviewResponse.builder()
                    .id(lesson.getId())
                    .name(lesson.getName())
                    .contentType(lesson.getContentType())
                    .description(lesson.getDescription())
                    .durationMin(lesson.getDurationMin())
                    .previewType("LOCKED")
                    .locked(false)
                    .contentUrl(lesson.getContentUrl())
                    .ctaUrl(null)
                    .build();
        } else {
            return LessonPreviewResponse.builder()
                    .id(lesson.getId())
                    .name(lesson.getName())
                    .contentType(lesson.getContentType())
                    .description(lesson.getDescription())
                    .durationMin(lesson.getDurationMin())
                    .previewType("LOCKED")
                    .locked(true)
                    .contentUrl(null)
                    .ctaUrl("/checkout?courseId=" + courseId)
                    .build();
        }
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
