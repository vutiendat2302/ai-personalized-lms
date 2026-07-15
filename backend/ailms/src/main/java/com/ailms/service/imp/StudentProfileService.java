package com.ailms.service.imp;
import com.ailms.repository.specification.StudentProfileSpecification;
import com.ailms.request.StudentProfileSearchRequest;
import com.ailms.service.IStudentProfileService;


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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StudentProfileService implements IStudentProfileService {
    @Override
    public Page<StudentProfileResponse> search(StudentProfileSearchRequest request) {
        log.info("Searching StudentProfile via specification");
        Specification<StudentProfileEntity> spec = StudentProfileSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<StudentProfileEntity> page = studentProfileRepository.findAll(spec, pageable);
        return page.map(studentProfileMapper::toResponse);
    }


    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final StudentProfileMapper studentProfileMapper;

    private static final String RESOURCE_NAME = "StudentProfile";

    public List<StudentProfileResponse> getAll() {
        log.info("Getting all student profiles");
        return studentProfileMapper.toResponseList(studentProfileRepository.findAll());
    }

    public StudentProfileResponse getById(Long id) {
        log.info("Getting student profile by id: {}", id);
        StudentProfileEntity entity = studentProfileRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return studentProfileMapper.toResponse(entity);
    }

    @Transactional
    public StudentProfileResponse create(StudentProfileRequest request) {
        log.info("Creating student profile for user: {}", request.getUserId());

        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> ResourceNotFoundException.of("User", request.getUserId()));

        if (studentProfileRepository.existsById(request.getUserId())) {
            throw new DuplicateResourceException("Student profile already exists for user ID: " + request.getUserId());
        }

        if (studentProfileRepository.existsByStudentCode(request.getStudentCode())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "studentCode", request.getStudentCode());
        }

        StudentProfileEntity entity = studentProfileMapper.toEntity(request);
        entity.setUserEntity(user);

        StudentProfileEntity saved = studentProfileRepository.save(entity);
        return studentProfileMapper.toResponse(saved);
    }

    @Transactional
    public StudentProfileResponse update(Long id, StudentProfileRequest request) {
        log.info("Updating student profile: {}", id);

        StudentProfileEntity existing = studentProfileRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (!existing.getStudentCode().equals(request.getStudentCode()) &&
                studentProfileRepository.existsByStudentCode(request.getStudentCode())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "studentCode", request.getStudentCode());
        }

        studentProfileMapper.updateFromRequest(request, existing);
        StudentProfileEntity updated = studentProfileRepository.save(existing);
        return studentProfileMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting student profile: {}", id);
        if (!studentProfileRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        studentProfileRepository.deleteById(id);
    }
}
