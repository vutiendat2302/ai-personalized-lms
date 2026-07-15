package com.ailms.service.imp;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import com.ailms.request.EmployeeSearchRequest;
import com.ailms.repository.specification.EmployeeSpecification;
import com.ailms.entity.EmployeeEntity;
import com.ailms.response.EmployeeResponse;


import com.ailms.entity.DepartmentEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.UserEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.EmployeeMapper;
import com.ailms.repository.DepartmentRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.CreateEmployeeRequest;
import com.ailms.request.UpdateEmployeeRequest;
import com.ailms.response.EmployeeResponse;
import com.ailms.service.IEmployeeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class EmployeeService implements IEmployeeService {
    @Override
    public Page<EmployeeResponse> search(EmployeeSearchRequest request) {
        log.info("Searching Employee via specification");
        Specification<EmployeeEntity> spec = EmployeeSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<EmployeeEntity> page = employeeRepository.findAll(spec, pageable);
        return page.map(employeeMapper::toResponse);
    }


    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final EmployeeMapper employeeMapper;

    private static final String RESOURCE_NAME = "Employee";

    @Override
    public List<EmployeeResponse> getAll() {
        log.info("Getting all employees");
        return employeeMapper.toResponseList(employeeRepository.findAll());
    }

    @Override
    public EmployeeResponse getById(Long id) {
        log.info("Getting employee by id: {}", id);
        EmployeeEntity entity = employeeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return employeeMapper.toResponse(entity);
    }

    @Transactional
    @Override
    public EmployeeResponse create(CreateEmployeeRequest request) {
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
    @Override
    public EmployeeResponse update(Long id, UpdateEmployeeRequest request) {
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
    @Override
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
