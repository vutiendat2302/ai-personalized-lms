package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.AssignmentSearchRequest;
import com.ailms.response.AssignmentResponse;

import com.ailms.entity.AssignmentEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.AssignmentMapper;
import com.ailms.repository.AssignmentRepository;
import com.ailms.request.AssignmentRequest;
import com.ailms.response.AssignmentResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface IAssignmentService {
    PageResponse<AssignmentResponse> search(AssignmentSearchRequest request);

    List<AssignmentResponse> getAll();

    AssignmentResponse getById(Long id);

    List<AssignmentResponse> getByLessonId(Long lessonId);

    List<AssignmentResponse> getByCourseId(Long courseId);

    List<AssignmentResponse> getBySectionId(Long sectionId);

    AssignmentResponse create(AssignmentRequest request);

    AssignmentResponse update(Long id, AssignmentRequest request);

    void delete(Long id);
}
