package com.ailms.service;

import com.ailms.entity.SubmissionEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.SubmissionMapper;
import com.ailms.repository.FileMetadataRepository;
import com.ailms.repository.SubmissionRepository;
import com.ailms.request.SubmissionRequest;
import com.ailms.response.SubmissionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final SubmissionMapper submissionMapper;
    private final FileMetadataRepository fileMetadataRepository;

    private static final String RESOURCE_NAME = "Submission";

    public List<SubmissionResponse> getAll() {
        log.info("Getting all submissions");
        return submissionMapper.toResponseList(submissionRepository.findAll());
    }

    public SubmissionResponse getById(Long id) {
        log.info("Getting submission by id: {}", id);
        SubmissionEntity entity = submissionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return submissionMapper.toResponse(entity);
    }

    public List<SubmissionResponse> getByAssignmentId(Long assignmentId) {
        log.info("Getting submissions by assignment id: {}", assignmentId);
        return submissionMapper.toResponseList(submissionRepository.findByAssignmentId(assignmentId));
    }

    public List<SubmissionResponse> getByUserId(Long userId) {
        log.info("Getting submissions by user id: {}", userId);
        return submissionMapper.toResponseList(submissionRepository.findByUserId(userId));
    }

    public List<SubmissionResponse> getByEnrollmentId(Long enrollmentId) {
        log.info("Getting submissions by enrollment id: {}", enrollmentId);
        return submissionMapper.toResponseList(submissionRepository.findByEnrollmentId(enrollmentId));
    }

    @Transactional
    public SubmissionResponse create(SubmissionRequest request) {
        log.info("Creating submission for assignment: {}", request.getAssignmentId());
        SubmissionEntity entity = submissionMapper.toEntity(request);
        
        if (request.getFileUrl() != null) {
            fileMetadataRepository.findByFileUrl(request.getFileUrl())
                    .ifPresent(entity::setFileMetadata);
        }

        SubmissionEntity saved = submissionRepository.save(entity);
        return submissionMapper.toResponse(saved);
    }

    @Transactional
    public SubmissionResponse update(Long id, SubmissionRequest request) {
        log.info("Updating submission: {}", id);
        SubmissionEntity existing = submissionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        submissionMapper.updateFromRequest(request, existing);

        if (request.getFileUrl() != null) {
            fileMetadataRepository.findByFileUrl(request.getFileUrl())
                    .ifPresentOrElse(
                            existing::setFileMetadata,
                            () -> existing.setFileMetadata(null)
                    );
        } else {
            existing.setFileMetadata(null);
        }

        SubmissionEntity updated = submissionRepository.save(existing);
        return submissionMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting submission: {}", id);
        if (!submissionRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        submissionRepository.deleteById(id);
    }
}
