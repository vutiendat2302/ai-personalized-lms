package com.ailms.service.imp;
import com.ailms.repository.specification.LearningActivityLogSpecification;
import com.ailms.request.CreateLearningActivityLogRequest;
import com.ailms.request.LearningActivityLogSearchRequest;
import com.ailms.service.ILearningActivityLogService;


import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.LearningActivityLogMapper;
import com.ailms.repository.LearningActivityLogRepository;
import com.ailms.response.LearningActivityLogResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LearningActivityLogService implements ILearningActivityLogService {

    private final LearningActivityLogRepository learningActivityLogRepository;
    private final LearningActivityLogMapper learningActivityLogMapper;

    private static final String RESOURCE_NAME = "LearningActivityLog";

    public List<LearningActivityLogResponse> getAll() {
        log.info("Getting all learning activity logs");
        return learningActivityLogMapper.toResponseList(learningActivityLogRepository.findAll());
    }

    public LearningActivityLogResponse getById(Long id) {
        log.info("Getting learning activity log by id: {}", id);
        LearningActivityLogEntity entity = learningActivityLogRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return learningActivityLogMapper.toResponse(entity);
    }

    public List<LearningActivityLogResponse> getByUserId(Long userId) {
        log.info("Getting learning activity logs by user id: {}", userId);
        return learningActivityLogMapper.toResponseList(learningActivityLogRepository.findByUserId(userId));
    }

    public List<LearningActivityLogResponse> getByEntity(String entityType, Long entityId) {
        log.info("Getting learning activity logs by entity: {} {}", entityType, entityId);
        return learningActivityLogMapper.toResponseList(
                learningActivityLogRepository.findByEntityTypeAndEntityId(entityType, entityId));
    }

    @Transactional
    public LearningActivityLogResponse create(CreateLearningActivityLogRequest request) {
        log.info("Creating learning activity log for user: {}", request.getUserId());
        LearningActivityLogEntity entity = learningActivityLogMapper.toEntity(request);
        LearningActivityLogEntity saved = learningActivityLogRepository.save(entity);
        return learningActivityLogMapper.toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting learning activity log: {}", id);
        if (!learningActivityLogRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        learningActivityLogRepository.deleteById(id);
    }

    @Override
    public PageResponse<LearningActivityLogResponse> search(LearningActivityLogSearchRequest request) {
        log.info("Searching LearningActivityLog via specification");
        Specification<LearningActivityLogEntity> spec = LearningActivityLogSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<LearningActivityLogEntity> page = learningActivityLogRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(learningActivityLogMapper::toResponse));
    }

}
