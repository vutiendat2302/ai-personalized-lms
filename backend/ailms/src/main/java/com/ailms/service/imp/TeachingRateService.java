package com.ailms.service.imp;
import com.ailms.entity.ClassEntity;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.specification.TeachingRateSpecification;
import com.ailms.request.CreateTeachingRateRequest;
import com.ailms.request.TeachingRateSearchRequest;
import com.ailms.request.UpdateTeachingRateRequest;
import com.ailms.service.ITeachingRateService;


import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.TeachingRateEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.TeachingRateMapper;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.TeachingRateRepository;
import com.ailms.response.TeachingRateResponse;
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
public class TeachingRateService implements ITeachingRateService {

    private final TeachingRateRepository teachingRateRepository;
    private final EmployeeRepository employeeRepository;
    private final TeachingRateMapper teachingRateMapper;

    private static final String RESOURCE_NAME = "TeachingRate";
    private final ClassRepository classRepository;

    public List<TeachingRateResponse> getAll() {
        log.info("Getting all teaching rates");
        return teachingRateMapper.toResponseList(teachingRateRepository.findAll());
    }

    public TeachingRateResponse getById(Long id) {
        log.info("Getting teaching rate by id: {}", id);
        TeachingRateEntity entity = teachingRateRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return teachingRateMapper.toResponse(entity);
    }

    public List<TeachingRateResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting teaching rates for employee: {}", employeeId);
        return teachingRateMapper.toResponseList(teachingRateRepository.findByEmployeeEntity_UserId(employeeId));
    }

    @Transactional
    public TeachingRateResponse create(CreateTeachingRateRequest request) {
        log.info("Creating teaching rate for employee: {}", request.getEmployeeId());

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        ClassEntity classEntity = classRepository.findById(request.getClassId())
                .orElseThrow(() -> ResourceNotFoundException.of("Class", request.getClassId()));
        TeachingRateEntity entity = teachingRateMapper.toEntity(request);
        entity.setEmployeeEntity(employee);
        entity.setClassEntity(classEntity);

        TeachingRateEntity saved = teachingRateRepository.save(entity);
        return teachingRateMapper.toResponse(saved);
    }

    @Transactional
    public TeachingRateResponse update(Long id, UpdateTeachingRateRequest request) {
        log.info("Updating teaching rate: {}", id);

        TeachingRateEntity existing = teachingRateRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        teachingRateMapper.updateFromRequest(request, existing);
        if (request.getEmployeeId() != null) {
            EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));
            existing.setEmployeeEntity(employee);
        }

        if (request.getClassId() != null) {
            ClassEntity classEntity = classRepository.findById(request.getClassId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Class", request.getClassId()));
            existing.setClassEntity(classEntity);
        }

        TeachingRateEntity updated = teachingRateRepository.save(existing);
        return teachingRateMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting teaching rate: {}", id);
        if (!teachingRateRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        teachingRateRepository.deleteById(id);
    }

    @Override
    public Page<TeachingRateResponse> search(TeachingRateSearchRequest request) {
        log.info("Searching TeachingRate via specification");
        Specification<TeachingRateEntity> spec = TeachingRateSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<TeachingRateEntity> page = teachingRateRepository.findAll(spec, pageable);
        return page.map(teachingRateMapper::toResponse);
    }

}
