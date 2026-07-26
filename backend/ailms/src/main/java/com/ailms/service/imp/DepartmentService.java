package com.ailms.service.imp;
import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.common.util.CodeGenerator;
import com.ailms.entity.CategoryEntity;
import com.ailms.event.AuditLogEvent;
import com.ailms.service.IDepartmentService;


import com.ailms.entity.DepartmentEntity;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.entity.EmployeeEntity;
import com.ailms.mapper.DepartmentMapper;
import com.ailms.mapper.EmployeeMapper;
import com.ailms.repository.DepartmentRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.specification.DepartmentSpecification;
import com.ailms.request.*;
import com.ailms.response.DepartmentResponse;
import com.ailms.response.EmployeeResponse;
import com.ailms.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.EmployeeStatusEnum;

import com.ailms.common.util.SortFieldResolver;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DepartmentService implements IDepartmentService {

    private static final String RESOURCE_NAME = "Department";

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentMapper departmentMapper;
    private final EmployeeMapper employeeMapper;
    private final SortFieldResolver sortFieldResolver;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Override
    @Transactional
    public DepartmentResponse createDepartment(CreateDepartmentRequest request) {
        String code = request.getCode();
        if (code == null || code.trim().isEmpty()) {
            code = CodeGenerator.generate("DP", departmentRepository::existsByCodeIgnoreCase);
        } else {
            if (departmentRepository.existsByCodeIgnoreCase(code)) {
                throw DuplicateResourceException.of(RESOURCE_NAME, "code", code);
            }
        }

        DepartmentEntity entity = departmentMapper.toDepartmentEntity(request);
        entity.setCode(code);
        entity.setStatus(BaseStatusEnum.ACTIVE);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "DEPARTMENT", entity.getId(), null, entity));
        return departmentMapper.toDepartmentResponse(departmentRepository.save(entity));
    }

    @Override
    @Transactional
    public DepartmentResponse updateDepartment(Long id, UpdateDepartmentRequest request) {
        DepartmentEntity entity = findEntityById(id);
        String oldValue = SimpleJsonWriter.toJson(entity);
        if (request.getStatus() == BaseStatusEnum.INACTIVE) {
            boolean hasActiveEmployees = employeeRepository.existsByDepartment_IdAndStatusNot(id, EmployeeStatusEnum.DELETE);
            if (hasActiveEmployees) {
                throw new BusinessException("Cannot set department to INACTIVE while it still has active employees.");
            }
        }

        departmentMapper.updateDepartmentEntity(entity, request);
        DepartmentEntity save = departmentRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "DEPARTMENT", id, oldValue, save));
        return departmentMapper.toDepartmentResponse(save);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        DepartmentEntity entity = findEntityById(id);
        String oldValue = SimpleJsonWriter.toJson(entity);
        boolean hasActiveEmployees = employeeRepository.existsByDepartment_IdAndStatusNot(id, EmployeeStatusEnum.DELETE);
        if (hasActiveEmployees) {
            throw new BusinessException("Cannot delete department that has active employees");
        }

        departmentRepository.delete(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "DEPARTMENT", id, oldValue, null));
    }

    @Override
    public DepartmentResponse getDepartmentById(Long id) {
        return departmentMapper.toDepartmentResponse(findEntityById(id));
    }

    @Override
    public List<DepartmentResponse> getDepartments() {
        return departmentRepository.findAll().stream()
                .map(departmentMapper::toDepartmentResponse)
                .toList();
    }

    @Override
    public PageResponse<DepartmentResponse> search(DepartmentSearchRequest request) {
        org.springframework.data.domain.Pageable pageable = request.toPageable();
        if (pageable.getSort().isSorted()) {
            pageable = org.springframework.data.domain.PageRequest.of(
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    sortFieldResolver.resolve(pageable.getSort(), DepartmentEntity.class)
            );
        }
        Page<DepartmentEntity> page = departmentRepository.findAll(
                DepartmentSpecification.filterAndSearch(request),
                pageable
        );

        return PageResponse.from(page.map(departmentMapper::toDepartmentResponse));
    }

    @Override
    public List<EmployeeResponse> getEmployeesByDepartmentId(Long id) {
        findEntityById(id);
        List<EmployeeEntity> employees = employeeRepository.findByDepartment_Id(id);
        return employeeMapper.toResponseList(employees);
    }

    private DepartmentEntity findEntityById(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
    }
}
