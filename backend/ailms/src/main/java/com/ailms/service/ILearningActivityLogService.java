package com.ailms.service;

import com.ailms.request.CreateLearningActivityLogRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.LearningActivityLogSearchRequest;
import com.ailms.response.LearningActivityLogResponse;


import java.util.List;

public interface ILearningActivityLogService {
    PageResponse<LearningActivityLogResponse> search(LearningActivityLogSearchRequest request);
    List<LearningActivityLogResponse> getAll();
    LearningActivityLogResponse getById(Long id);
    List<LearningActivityLogResponse> getByUserId(Long userId);
    List<LearningActivityLogResponse> getByEntity(String entityType, Long entityId);
    LearningActivityLogResponse create(CreateLearningActivityLogRequest request);
    void delete(Long id);
}
