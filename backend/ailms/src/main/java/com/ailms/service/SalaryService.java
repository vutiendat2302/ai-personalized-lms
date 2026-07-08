package com.ailms.service;

import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.SalaryEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.SalaryMapper;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.SalaryRepository;
import com.ailms.request.SalaryRequest;
import com.ailms.response.SalaryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SalaryService {

    private final SalaryRepository salaryRepository;
    private final EmployeeRepository employeeRepository;
    private final SalaryMapper salaryMapper;

    private static final String RESOURCE_NAME = "Salary";

    public List<SalaryResponse> getAll() {
        log.info("Getting all salary records");
        return salaryMapper.toResponseList(salaryRepository.findAll());
    }

    public SalaryResponse getById(Long id) {
        log.info("Getting salary record by id: {}", id);
        SalaryEntity entity = salaryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return salaryMapper.toResponse(entity);
    }

    public List<SalaryResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting salary records for employee: {}", employeeId);
        return salaryMapper.toResponseList(salaryRepository.findByEmployee_UserId(employeeId));
    }

    @Transactional
    public SalaryResponse create(SalaryRequest request) {
        log.info("Creating salary record for employee: {} and period: {}", request.getEmployeeId(), request.getPeriod());

        if (salaryRepository.existsByEmployee_UserIdAndPeriod(request.getEmployeeId(), request.getPeriod())) {
            throw new DuplicateResourceException("Salary record already exists for employee ID: " + request.getEmployeeId() + " and period: " + request.getPeriod());
        }

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        SalaryEntity entity = salaryMapper.toEntity(request);
        entity.setEmployee(employee);

        SalaryEntity saved = salaryRepository.save(entity);
        return salaryMapper.toResponse(saved);
    }

    @Transactional
    public SalaryResponse update(Long id, SalaryRequest request) {
        log.info("Updating salary record: {}", id);

        SalaryEntity existing = salaryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if ((!existing.getEmployee().getUserId().equals(request.getEmployeeId()) || !existing.getPeriod().equals(request.getPeriod())) &&
                salaryRepository.existsByEmployee_UserIdAndPeriod(request.getEmployeeId(), request.getPeriod())) {
            throw new DuplicateResourceException("Salary record already exists for employee ID: " + request.getEmployeeId() + " and period: " + request.getPeriod());
        }

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        salaryMapper.updateFromRequest(request, existing);
        existing.setEmployee(employee);

        SalaryEntity updated = salaryRepository.save(existing);
        return salaryMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting salary record: {}", id);
        if (!salaryRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        salaryRepository.deleteById(id);
    }
}
