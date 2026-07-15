package com.ailms.service.imp;
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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DepartmentService implements IDepartmentService {

    private static final String RESOURCE_NAME = "Department";

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentMapper departmentMapper;

    @Override
    @Transactional
    public DepartmentResponse createDepartment(CreateDepartmentRequest request) {
        if (departmentRepository.existsByCodeIgnoreCase(request.getCode())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "code", request.getCode());
        }

        DepartmentEntity entity = departmentMapper.toDepartmentEntity(request);
        entity.setParent(resolveParent(null, request.getParentId()));

        return departmentMapper.toDepartmentResponse(departmentRepository.save(entity));
    }

    @Override
    @Transactional
    public DepartmentResponse updateDepartment(Long id, UpdateDepartmentRequest request) {
        DepartmentEntity entity = findEntityById(id);

        if (departmentRepository.existsByCodeIgnoreCaseAndIdNot(request.getCode(), id)) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "code", request.getCode());
        }

        departmentMapper.updateDepartmentEntity(entity, request);
        entity.setParent(resolveParent(id, request.getParentId()));

        return departmentMapper.toDepartmentResponse(departmentRepository.save(entity));
    }

    @Override
    @Transactional
    public DepartmentResponse updateStatus(Long id, DepartmentStatusRequest request) {
        DepartmentEntity entity = findEntityById(id);
        entity.setStatus(request.getStatus());
        return departmentMapper.toDepartmentResponse(departmentRepository.save(entity));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        DepartmentEntity entity = findEntityById(id);

        if (departmentRepository.existsByParent_Id(id)) {
            throw new BusinessException("Cannot delete department that has child departments");
        }
        if (employeeRepository.existsByDepartment_Id(id)) {
            throw new BusinessException("Cannot delete department that has employees");
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
        Page<DepartmentEntity> page = departmentRepository.findAll(
                DepartmentSpecification.filterAndSearch(request),
                request.toPageable()
        );

        return PageResponse.from(page.map(departmentMapper::toDepartmentResponse));
    }

    private DepartmentEntity findEntityById(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
    }

    private DepartmentEntity resolveParent(Long departmentId, Long parentId) {
        if (parentId == null) {
            return null;
        }

        if (departmentId != null && departmentId.equals(parentId)) {
            throw new BusinessException("Department cannot be its own parent");
        }

        DepartmentEntity parent = departmentRepository.findById(parentId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, parentId));

        if (departmentId != null) {
            DepartmentEntity current = parent;
            while (current.getParent() != null) {
                if (current.getParent().getId().equals(departmentId)) {
                    throw new BusinessException("Circular department hierarchy is not allowed");
                }
                current = current.getParent();
            }
        }

        return parent;
    }
}
