package com.ailms.service.imp;
import com.ailms.entity.CategoryEntity;
import com.ailms.service.IDepartmentService;


import com.ailms.entity.DepartmentEntity;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.DepartmentMapper;
import com.ailms.repository.DepartmentRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.specification.DepartmentSpecification;
import com.ailms.request.*;
import com.ailms.response.DepartmentResponse;
import com.ailms.response.PageResponse;
import lombok.RequiredArgsConstructor;
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
    private final SortFieldResolver sortFieldResolver;

    @Override
    @Transactional
    public DepartmentResponse createDepartment(CreateDepartmentRequest request) {
        String code = request.getCode();
        if (code == null || code.trim().isEmpty()) {
            code = com.ailms.common.util.CodeGenerator.generate("DP", departmentRepository::existsByCodeIgnoreCase);
        } else {
            if (departmentRepository.existsByCodeIgnoreCase(code)) {
                throw DuplicateResourceException.of(RESOURCE_NAME, "code", code);
            }
        }

        DepartmentEntity entity = departmentMapper.toDepartmentEntity(request);
        entity.setCode(code);
        entity.setStatus(BaseStatusEnum.ACTIVE);

        return departmentMapper.toDepartmentResponse(departmentRepository.save(entity));
    }

    @Override
    @Transactional
    public DepartmentResponse updateDepartment(Long id, UpdateDepartmentRequest request) {
        DepartmentEntity entity = findEntityById(id);

        if (request.getStatus() == BaseStatusEnum.INACTIVE) {
            boolean hasActiveEmployees = employeeRepository.existsByDepartment_IdAndStatusNot(id, EmployeeStatusEnum.DELETE);
            if (hasActiveEmployees) {
                throw new BusinessException("Cannot set department to INACTIVE while it still has active employees.");
            }
        }

        departmentMapper.updateDepartmentEntity(entity, request);

        return departmentMapper.toDepartmentResponse(departmentRepository.save(entity));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        DepartmentEntity entity = findEntityById(id);

        boolean hasActiveEmployees = employeeRepository.existsByDepartment_IdAndStatusNot(id, EmployeeStatusEnum.DELETE);
        if (hasActiveEmployees) {
            throw new BusinessException("Cannot delete department that has active employees");
        }

        departmentRepository.delete(entity);
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

    private DepartmentEntity findEntityById(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
    }
}
