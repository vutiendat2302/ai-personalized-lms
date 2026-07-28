package com.ailms.service.imp;
import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.common.util.CodeGenerator;
import com.ailms.entity.CategoryEntity;
import com.ailms.entity.enums.UserStatusEnum;
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
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
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
            boolean hasActiveEmployees = employeeRepository.existsByDepartment_IdAndUserEntity_StatusNot(id, UserStatusEnum.DELETED);
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
        boolean hasActiveEmployees = employeeRepository.existsByDepartment_IdAndUserEntity_StatusNot(id, UserStatusEnum.DELETED);
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

    @Override
    public java.util.Map<String, Object> getDepartmentOverviewStats() {
        log.info("Getting department overview stats");
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("totalDepartments", departmentRepository.count());
        map.put("activeDepartments", departmentRepository.countActiveDepartments());
        map.put("emptyDepartments", departmentRepository.countEmptyDepartments());

        // Count Employees by Department (Horizontal Bar Chart)
        java.util.Map<String, Long> employeesByDept = new java.util.LinkedHashMap<>();
        for (Object[] r : departmentRepository.countEmployeesByDepartment()) {
            employeesByDept.put((String) r[0], (Long) r[1]);
        }
        map.put("employeesByDepartment", employeesByDept);

        // Employment Type breakdown by Department
        java.util.List<java.util.Map<String, Object>> typeBreakdown = new java.util.ArrayList<>();
        for (Object[] r : departmentRepository.countEmploymentTypesByDepartment()) {
            java.util.Map<String, Object> item = new java.util.HashMap<>();
            item.put("deptName", r[0]);
            item.put("employmentType", r[1] != null ? r[1].toString() : "FULL_TIME");
            item.put("count", r[2]);
            typeBreakdown.add(item);
        }
        map.put("employmentTypeBreakdown", typeBreakdown);

        return map;
    }

    @Transactional
    @Override
    public void transferEmployees(Long targetDeptId, List<Long> employeeIds) {
        log.info("Transferring {} employees to department {}", employeeIds.size(), targetDeptId);
        DepartmentEntity targetDept = findEntityById(targetDeptId);
        List<EmployeeEntity> employees = employeeRepository.findAllById(employeeIds);
        for (EmployeeEntity emp : employees) {
            emp.setDepartment(targetDept);
        }
        employeeRepository.saveAll(employees);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "TRANSFER_EMPLOYEES", "DEPARTMENT", targetDeptId, null, employeeIds));
    }

    private DepartmentEntity findEntityById(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
    }
}

