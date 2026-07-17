package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.CourseTeacherSearchRequest;
import com.ailms.response.CourseTeacherResponse;


import com.ailms.entity.CourseEntity;
import com.ailms.entity.CourseTeacherEntity;
import com.ailms.entity.CourseTeacherId;
import com.ailms.entity.UserEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CourseTeacherMapper;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CourseTeacherRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.CourseTeacherRequest;
import com.ailms.response.CourseTeacherResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface ICourseTeacherService {
    PageResponse<CourseTeacherResponse> search(CourseTeacherSearchRequest request);
    List<CourseTeacherResponse> getAll();
    CourseTeacherResponse getById(Long courseId, Long userId);
    List<CourseTeacherResponse> getByCourseId(Long courseId);
    List<CourseTeacherResponse> getByUserId(Long userId);
    CourseTeacherResponse create(CourseTeacherRequest request);
    CourseTeacherResponse update(Long courseId, Long userId, CourseTeacherRequest request);
    void delete(Long courseId, Long userId);
}
