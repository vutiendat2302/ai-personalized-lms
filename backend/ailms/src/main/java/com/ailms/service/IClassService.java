package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.ClassSearchRequest;
import com.ailms.response.ClassResponse;


import com.ailms.entity.ClassEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.ClassMapper;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.request.ClassRequest;
import com.ailms.response.ClassResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface IClassService {
    PageResponse<ClassResponse> search(ClassSearchRequest request);
    List<ClassResponse> getAll();
    ClassResponse getById(Long id);
    List<ClassResponse> getByCourseId(Long courseId);
    ClassResponse create(ClassRequest request);
    ClassResponse update(Long id, ClassRequest request);
    void delete(Long id);
}
