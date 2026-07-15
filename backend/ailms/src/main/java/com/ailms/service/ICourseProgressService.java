package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.CourseProgressSearchRequest;
import com.ailms.response.CourseProgressResponse;


import com.ailms.entity.CourseProgressEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CourseProgressMapper;
import com.ailms.repository.CourseProgressRepository;
import com.ailms.request.CourseProgressRequest;
import com.ailms.response.CourseProgressResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface ICourseProgressService {
    Page<CourseProgressResponse> search(CourseProgressSearchRequest request);
    List<CourseProgressResponse> getAll();
    CourseProgressResponse getById(Long id);
    List<CourseProgressResponse> getByUserId(Long userId);
    List<CourseProgressResponse> getByCourseId(Long courseId);
    List<CourseProgressResponse> getByEnrollmentId(Long enrollmentId);
    CourseProgressResponse create(CourseProgressRequest request);
    CourseProgressResponse update(Long id, CourseProgressRequest request);
    void delete(Long id);
}
