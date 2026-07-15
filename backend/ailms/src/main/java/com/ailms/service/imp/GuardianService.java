package com.ailms.service.imp;
import com.ailms.repository.specification.GuardianSpecification;
import com.ailms.request.GuardianSearchRequest;
import com.ailms.service.IGuardianService;


import com.ailms.entity.GuardianEntity;
import com.ailms.entity.StudentProfileEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.GuardianMapper;
import com.ailms.repository.GuardianRepository;
import com.ailms.repository.StudentProfileRepository;
import com.ailms.request.GuardianRequest;
import com.ailms.response.GuardianResponse;
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
public class GuardianService implements IGuardianService {
    @Override
    public Page<GuardianResponse> search(GuardianSearchRequest request) {
        log.info("Searching Guardian via specification");
        Specification<GuardianEntity> spec = GuardianSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<GuardianEntity> page = guardianRepository.findAll(spec, pageable);
        return page.map(guardianMapper::toResponse);
    }


    private final GuardianRepository guardianRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final GuardianMapper guardianMapper;

    private static final String RESOURCE_NAME = "Guardian";

    public List<GuardianResponse> getAll() {
        log.info("Getting all guardian records");
        return guardianMapper.toResponseList(guardianRepository.findAll());
    }

    public GuardianResponse getById(Long id) {
        log.info("Getting guardian record by id: {}", id);
        GuardianEntity entity = guardianRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return guardianMapper.toResponse(entity);
    }

    public List<GuardianResponse> getByStudentUserId(Long studentUserId) {
        log.info("Getting guardians for student user ID: {}", studentUserId);
        return guardianMapper.toResponseList(guardianRepository.findByStudentProfile_UserId(studentUserId));
    }

    @Transactional
    public GuardianResponse create(GuardianRequest request) {
        log.info("Creating guardian for student: {}", request.getStudentUserId());

        StudentProfileEntity studentProfile = studentProfileRepository.findById(request.getStudentUserId())
                .orElseThrow(() -> ResourceNotFoundException.of("StudentProfile", request.getStudentUserId()));

        GuardianEntity entity = guardianMapper.toEntity(request);
        entity.setStudentProfile(studentProfile);

        GuardianEntity saved = guardianRepository.save(entity);
        return guardianMapper.toResponse(saved);
    }

    @Transactional
    public GuardianResponse update(Long id, GuardianRequest request) {
        log.info("Updating guardian record: {}", id);

        GuardianEntity existing = guardianRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        StudentProfileEntity studentProfile = studentProfileRepository.findById(request.getStudentUserId())
                .orElseThrow(() -> ResourceNotFoundException.of("StudentProfile", request.getStudentUserId()));

        guardianMapper.updateFromRequest(request, existing);
        existing.setStudentProfile(studentProfile);

        GuardianEntity updated = guardianRepository.save(existing);
        return guardianMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting guardian record: {}", id);
        if (!guardianRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        guardianRepository.deleteById(id);
    }
}
