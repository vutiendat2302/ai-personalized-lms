package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.LessonProgressSearchRequest;
import com.ailms.response.LessonProgressResponse;


import com.ailms.entity.LessonProgressEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.LessonProgressMapper;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.request.LessonProgressRequest;
import com.ailms.response.LessonProgressResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface ILessonProgressService {
    PageResponse<LessonProgressResponse> search(LessonProgressSearchRequest request);
    List<LessonProgressResponse> getAll();
    LessonProgressResponse getById(Long id);
    List<LessonProgressResponse> getByUserId(Long userId);
    List<LessonProgressResponse> getByLessonId(Long lessonId);
    List<LessonProgressResponse> getByEnrollmentId(Long enrollmentId);
    LessonProgressResponse create(LessonProgressRequest request);
    LessonProgressResponse update(Long id, LessonProgressRequest request);
    void delete(Long id);
}
