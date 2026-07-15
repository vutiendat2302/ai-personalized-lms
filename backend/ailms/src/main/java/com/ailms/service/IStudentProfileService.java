package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.StudentProfileSearchRequest;
import com.ailms.response.StudentProfileResponse;


import com.ailms.entity.StudentProfileEntity;
import com.ailms.entity.UserEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.StudentProfileMapper;
import com.ailms.repository.StudentProfileRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.StudentProfileRequest;
import com.ailms.response.StudentProfileResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface IStudentProfileService {
    Page<StudentProfileResponse> search(StudentProfileSearchRequest request);
    List<StudentProfileResponse> getAll();
    StudentProfileResponse getById(Long id);
    StudentProfileResponse create(StudentProfileRequest request);
    StudentProfileResponse update(Long id, StudentProfileRequest request);
    void delete(Long id);
}
