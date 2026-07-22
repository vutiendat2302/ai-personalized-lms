package com.ailms.service.imp;
import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.event.AuditLogEvent;
import com.ailms.repository.specification.LessonResourceSpecification;
import com.ailms.request.LessonResourceSearchRequest;
import com.ailms.service.ILessonResourceService;


import com.ailms.entity.LessonEntity;
import com.ailms.entity.LessonResourceEntity;
import com.ailms.entity.FileMetadataEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.LessonResourceMapper;
import com.ailms.repository.LessonRepository;
import com.ailms.repository.LessonResourceRepository;
import com.ailms.repository.FileMetadataRepository;
import com.ailms.request.CreateResourceRequest;
import com.ailms.request.UpdateResourceRequest;
import com.ailms.response.ResourceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonResourceService implements ILessonResourceService {
    private final ApplicationEventPublisher applicationEventPublisher;
    private final FileService fileService;

    @Override
    public PageResponse<ResourceResponse> search(LessonResourceSearchRequest request) {
        log.info("Searching LessonResource via specification");
        Specification<LessonResourceEntity> spec = LessonResourceSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<LessonResourceEntity> page = lessonResourceRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(lessonResourceMapper::toResponse));
    }


    private final LessonResourceRepository lessonResourceRepository;
    private final LessonRepository lessonRepository;
    private final LessonResourceMapper lessonResourceMapper;
    private final FileMetadataRepository fileMetadataRepository;

    @Override
    @Transactional
    public ResourceResponse create(CreateResourceRequest request) {
        log.info("Creating resource for lesson id: {}", request.getLessonId());

        if (request.getLessonId() == null) {
            throw new IllegalArgumentException("Lesson ID must not be null");
        }

        LessonEntity lesson = lessonRepository.findById(request.getLessonId())
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with id: " + request.getLessonId()));

        LessonResourceEntity entity = lessonResourceMapper.toEntity(request);
        entity.setLessonEntity(lesson);

        if (request.getFileMetadataId() == null) {
            throw new IllegalArgumentException("File Metadata ID must not be null");
        }
        FileMetadataEntity fileMetadata = fileMetadataRepository.findById(request.getFileMetadataId())
                .orElseThrow(() -> new ResourceNotFoundException("File metadata not found with id: " + request.getFileMetadataId()));
        entity.setFileMetadata(fileMetadata);

        LessonResourceEntity savedEntity = lessonResourceRepository.save(entity);
        ResourceResponse resourceResponse = lessonResourceMapper.toResponse(entity);
        resourceResponse.setFileUrl(fileService.getDownloadUrl(entity.getFileMetadata().getFileKey()));

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "RESOURCE_LESSON", request.getLessonId(), null, savedEntity));
        return resourceResponse;
    }

    @Override
    @Transactional
    public ResourceResponse update(Long id, UpdateResourceRequest request) {
        log.info("Updating resource with id: {}", id);

        LessonResourceEntity existingEntity = lessonResourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));

        String oldValue = SimpleJsonWriter.toJson(existingEntity);
        lessonResourceMapper.updateEntityFromRequest(request, existingEntity);
        
        if (request.getFileMetadataId() != null) {
            FileMetadataEntity fileMetadata = fileMetadataRepository.findById(request.getFileMetadataId())
                    .orElseThrow(() -> new ResourceNotFoundException("File metadata not found with id: " + request.getFileMetadataId()));
            existingEntity.setFileMetadata(fileMetadata);
        }

        LessonResourceEntity updatedEntity = lessonResourceRepository.save(existingEntity);
        ResourceResponse resourceResponse = lessonResourceMapper.toResponse(updatedEntity);
        resourceResponse.setFileUrl(fileService.getDownloadUrl(updatedEntity.getFileMetadata().getFileKey()));

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "RESOURCE_LESSON", id, oldValue, updatedEntity));
        return resourceResponse;
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting resource with id: {}", id);

        if (!lessonResourceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Resource not found with id: " + id);
        }

        lessonResourceRepository.deleteById(id);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "RESOURCE_LESSON", id, null, null));
    }

    @Override
    public List<ResourceResponse> getResourcesByLessonId(Long lessonId) {
        log.info("Getting resources for lesson id: {}", lessonId);

        LessonEntity lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with id: " + lessonId));

        return lesson.getResources().stream()
                .map(lessonResourceMapper::toResponse)
                .collect(Collectors.toList());
    }
}
