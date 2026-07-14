package com.ailms.service;

import com.ailms.entity.LessonEntity;
import com.ailms.entity.LessonResourceEntity;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonResourceService implements ILessonResourceService {

    private final LessonResourceRepository lessonResourceRepository;
    private final LessonRepository lessonRepository;
    private final LessonResourceMapper lessonResourceMapper;
    private final FileMetadataRepository fileMetadataRepository;

    @Override
    @Transactional
    public ResourceResponse create(Long lessonId, CreateResourceRequest request) {
        log.info("Creating resource for lesson id: {}", lessonId);

        LessonEntity lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with id: " + lessonId));

        LessonResourceEntity entity = lessonResourceMapper.toEntity(request);
        entity.setLessonEntity(lesson);

        if (request.getFileUrl() != null) {
            fileMetadataRepository.findByFileUrl(request.getFileUrl())
                    .ifPresent(entity::setFileMetadata);
        }

        LessonResourceEntity savedEntity = lessonResourceRepository.save(entity);
        return lessonResourceMapper.toResponse(savedEntity);
    }

    @Override
    @Transactional
    public ResourceResponse update(Long id, UpdateResourceRequest request) {
        log.info("Updating resource with id: {}", id);

        LessonResourceEntity existingEntity = lessonResourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));

        lessonResourceMapper.updateEntityFromRequest(request, existingEntity);

        if (request.getFileUrl() != null) {
            fileMetadataRepository.findByFileUrl(request.getFileUrl())
                    .ifPresentOrElse(
                            existingEntity::setFileMetadata,
                            () -> existingEntity.setFileMetadata(null)
                    );
        } else {
            existingEntity.setFileMetadata(null);
        }

        LessonResourceEntity updatedEntity = lessonResourceRepository.save(existingEntity);
        return lessonResourceMapper.toResponse(updatedEntity);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting resource with id: {}", id);

        if (!lessonResourceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Resource not found with id: " + id);
        }

        lessonResourceRepository.deleteById(id);
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
