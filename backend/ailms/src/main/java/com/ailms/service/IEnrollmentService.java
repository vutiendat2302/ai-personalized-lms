package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.EnrollmentSearchRequest;
import com.ailms.response.EnrollmentResponse;


import com.ailms.entity.ClassEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.UserEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.EnrollmentMapper;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.EnrollmentRequest;
import com.ailms.response.EnrollmentResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface IEnrollmentService {
    PageResponse<EnrollmentResponse> search(EnrollmentSearchRequest request);
    List<EnrollmentResponse> getAll();
    EnrollmentResponse getById(Long id);
    List<EnrollmentResponse> getByUserId(Long userId);
    List<EnrollmentResponse> getByCourseId(Long courseId);
    List<EnrollmentResponse> getByClassId(Long classId);
    EnrollmentResponse create(EnrollmentRequest request);
    EnrollmentResponse update(Long id, EnrollmentRequest request);
    void delete(Long id);
}
