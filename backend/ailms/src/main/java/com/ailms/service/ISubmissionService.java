package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.SubmissionSearchRequest;
import com.ailms.response.SubmissionResponse;


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

public interface ISubmissionService {
    Page<SubmissionResponse> search(SubmissionSearchRequest request);
    List<SubmissionResponse> getAll();
    SubmissionResponse getById(Long id);
    List<SubmissionResponse> getByAssignmentId(Long assignmentId);
    List<SubmissionResponse> getByUserId(Long userId);
    List<SubmissionResponse> getByEnrollmentId(Long enrollmentId);
    SubmissionResponse create(SubmissionRequest request);
    SubmissionResponse update(Long id, SubmissionRequest request);
    void delete(Long id);
}
