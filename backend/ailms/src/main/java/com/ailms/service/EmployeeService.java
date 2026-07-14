package com.ailms.service;

import com.ailms.entity.DepartmentEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.UserEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.EmployeeMapper;
import com.ailms.repository.DepartmentRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.EmployeeRequest;
import com.ailms.response.EmployeeResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final EmployeeMapper employeeMapper;

    private static final String RESOURCE_NAME = "Employee";

    public List<EmployeeResponse> getAll() {
        log.info("Getting all employees");
        return employeeMapper.toResponseList(employeeRepository.findAll());
    }

    public EmployeeResponse getById(Long id) {
        log.info("Getting employee by id: {}", id);
        EmployeeEntity entity = employeeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return employeeMapper.toResponse(entity);
    }

    @Transactional
    public EmployeeResponse create(EmployeeRequest request) {
        log.info("Creating employee for user: {}", request.getUserId());

        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> ResourceNotFoundException.of("User", request.getUserId()));

        if (employeeRepository.existsById(request.getUserId())) {
            throw new DuplicateResourceException("Employee already exists for user ID: " + request.getUserId());
        }

        if (employeeRepository.existsByEmployeeCode(request.getEmployeeCode())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "employeeCode", request.getEmployeeCode());
        }

        EmployeeEntity entity = employeeMapper.toEntity(request);
        entity.setUserEntity(user);
        entity.setDepartment(resolveDepartment(request.getDepartmentId()));

        EmployeeEntity saved = employeeRepository.save(entity);
        return employeeMapper.toResponse(saved);
    }

    @Transactional
    public EmployeeResponse update(Long id, EmployeeRequest request) {
        log.info("Updating employee: {}", id);

        EmployeeEntity existing = employeeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (!existing.getEmployeeCode().equals(request.getEmployeeCode()) &&
                employeeRepository.existsByEmployeeCode(request.getEmployeeCode())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "employeeCode", request.getEmployeeCode());
        }

        employeeMapper.updateFromRequest(request, existing);
        existing.setDepartment(resolveDepartment(request.getDepartmentId()));
        EmployeeEntity updated = employeeRepository.save(existing);
        return employeeMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting employee: {}", id);
        if (!employeeRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        employeeRepository.deleteById(id);
    }

    private DepartmentEntity resolveDepartment(Long departmentId) {
        if (departmentId == null) {
            return null;
        }
        return departmentRepository.findById(departmentId)
                .orElseThrow(() -> ResourceNotFoundException.of("Department", departmentId));
    }
}
