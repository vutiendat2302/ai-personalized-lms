package com.ailms.service.imp;
import com.ailms.service.IAssignmentService;


import com.ailms.entity.AssignmentEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.AssignmentMapper;
import com.ailms.repository.AssignmentRepository;
import com.ailms.repository.specification.AssignmentSpecification;
import com.ailms.request.AssignmentRequest;
import com.ailms.request.AssignmentSearchRequest;
import com.ailms.response.AssignmentResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AssignmentService implements IAssignmentService {
    @Override
    public Page<AssignmentResponse> search(AssignmentSearchRequest request) {
        log.info("Searching Assignment via specification");
        Specification<AssignmentEntity> spec = AssignmentSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<AssignmentEntity> page = assignmentRepository.findAll(spec, pageable);
        return page.map(assignmentMapper::toResponse);
    }


    private final AssignmentRepository assignmentRepository;
    private final AssignmentMapper assignmentMapper;

    private static final String RESOURCE_NAME = "Assignment";

    public List<AssignmentResponse> getAll() {
        log.info("Getting all assignments");
        return assignmentMapper.toResponseList(assignmentRepository.findAll());
    }

    public AssignmentResponse getById(Long id) {
        log.info("Getting assignment by id: {}", id);
        AssignmentEntity entity = assignmentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return assignmentMapper.toResponse(entity);
    }

    public List<AssignmentResponse> getByLessonId(Long lessonId) {
        log.info("Getting assignments by lesson id: {}", lessonId);
        return assignmentMapper.toResponseList(assignmentRepository.findByLessonId(lessonId));
    }

    public List<AssignmentResponse> getByCourseId(Long courseId) {
        log.info("Getting assignments by course id: {}", courseId);
        return assignmentMapper.toResponseList(assignmentRepository.findByCourseId(courseId));
    }

    public List<AssignmentResponse> getBySectionId(Long sectionId) {
        log.info("Getting assignments by section id: {}", sectionId);
        return assignmentMapper.toResponseList(assignmentRepository.findBySectionId(sectionId));
    }

    @Transactional
    public AssignmentResponse create(AssignmentRequest request) {
        log.info("Creating assignment: {}", request.getTitle());
        AssignmentEntity entity = assignmentMapper.toEntity(request);
        AssignmentEntity saved = assignmentRepository.save(entity);
        return assignmentMapper.toResponse(saved);
    }

    @Transactional
    public AssignmentResponse update(Long id, AssignmentRequest request) {
        log.info("Updating assignment: {}", id);
        AssignmentEntity existing = assignmentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        assignmentMapper.updateFromRequest(request, existing);
        AssignmentEntity updated = assignmentRepository.save(existing);
        return assignmentMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting assignment: {}", id);
        if (!assignmentRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        assignmentRepository.deleteById(id);
    }
}
