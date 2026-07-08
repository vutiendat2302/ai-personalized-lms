package com.ailms.service;

import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.TeachingRateEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.TeachingRateMapper;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.TeachingRateRepository;
import com.ailms.request.TeachingRateRequest;
import com.ailms.response.TeachingRateResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TeachingRateService {

    private final TeachingRateRepository teachingRateRepository;
    private final EmployeeRepository employeeRepository;
    private final TeachingRateMapper teachingRateMapper;

    private static final String RESOURCE_NAME = "TeachingRate";

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
        return teachingRateMapper.toResponseList(teachingRateRepository.findByEmployee_UserId(employeeId));
    }

    @Transactional
    public TeachingRateResponse create(TeachingRateRequest request) {
        log.info("Creating teaching rate for employee: {}", request.getEmployeeId());

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        TeachingRateEntity entity = teachingRateMapper.toEntity(request);
        entity.setEmployee(employee);

        TeachingRateEntity saved = teachingRateRepository.save(entity);
        return teachingRateMapper.toResponse(saved);
    }

    @Transactional
    public TeachingRateResponse update(Long id, TeachingRateRequest request) {
        log.info("Updating teaching rate: {}", id);

        TeachingRateEntity existing = teachingRateRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        teachingRateMapper.updateFromRequest(request, existing);
        existing.setEmployee(employee);

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
}
