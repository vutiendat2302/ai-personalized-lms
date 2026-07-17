package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.LearningActivityLogSearchRequest;
import com.ailms.response.LearningActivityLogResponse;


import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.LearningActivityLogMapper;
import com.ailms.repository.LearningActivityLogRepository;
import com.ailms.request.LearningActivityLogRequest;
import com.ailms.response.LearningActivityLogResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface ILearningActivityLogService {
    PageResponse<LearningActivityLogResponse> search(LearningActivityLogSearchRequest request);
    List<LearningActivityLogResponse> getAll();
    LearningActivityLogResponse getById(Long id);
    List<LearningActivityLogResponse> getByUserId(Long userId);
    List<LearningActivityLogResponse> getByEntity(String entityType, Long entityId);
    LearningActivityLogResponse create(LearningActivityLogRequest request);
    LearningActivityLogResponse update(Long id, LearningActivityLogRequest request);
    void delete(Long id);
}
