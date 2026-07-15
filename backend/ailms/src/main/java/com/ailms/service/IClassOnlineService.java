package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.ClassOnlineSearchRequest;
import com.ailms.response.ClassOnlineResponse;


import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassOnlineEntity;
import com.ailms.entity.UserEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.ClassOnlineMapper;
import com.ailms.repository.ClassOnlineRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.ClassOnlineRequest;
import com.ailms.response.ClassOnlineResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface IClassOnlineService {
    Page<ClassOnlineResponse> search(ClassOnlineSearchRequest request);
    List<ClassOnlineResponse> getAll();
    ClassOnlineResponse getById(Long id);
    List<ClassOnlineResponse> getByClassId(Long classId);
    List<ClassOnlineResponse> getByTeacherId(Long teacherId);
    ClassOnlineResponse create(ClassOnlineRequest request);
    ClassOnlineResponse update(Long id, ClassOnlineRequest request);
    void delete(Long id);
}
