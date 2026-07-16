package com.ailms.service.imp;
import com.ailms.repository.specification.EmployeeContractSpecification;
import com.ailms.request.CreateEmployeeContractRequest;
import com.ailms.request.EmployeeContractSearchRequest;
import com.ailms.request.UpdateEmployeeContractRequest;
import com.ailms.service.IEmployeeContractService;


import com.ailms.entity.EmployeeContractEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.EmployeeContractMapper;
import com.ailms.repository.EmployeeContractRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.FileMetadataRepository;
import com.ailms.response.EmployeeContractResponse;
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
public class EmployeeContractService implements IEmployeeContractService {

    private final EmployeeContractRepository employeeContractRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeContractMapper employeeContractMapper;
    private final FileMetadataRepository fileMetadataRepository;

    private static final String RESOURCE_NAME = "EmployeeContract";

    public List<EmployeeContractResponse> getAll() {
        log.info("Getting all employee contracts");
        return employeeContractMapper.toResponseList(employeeContractRepository.findAll());
    }

    public EmployeeContractResponse getById(Long id) {
        log.info("Getting contract by id: {}", id);
        EmployeeContractEntity entity = employeeContractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return employeeContractMapper.toResponse(entity);
    }

    public List<EmployeeContractResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting contracts for employee: {}", employeeId);
        return employeeContractMapper.toResponseList(employeeContractRepository.findByEmployee_UserId(employeeId));
    }

    @Transactional
    public EmployeeContractResponse create(CreateEmployeeContractRequest request) {
        log.info("Creating contract for employee: {}", request.getEmployeeId());

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        EmployeeContractEntity entity = employeeContractMapper.toEntity(request);
        entity.setEmployee(employee);

        if (request.getFileKey() != null) {
            fileMetadataRepository.findByFileKey(request.getFileKey())
                    .ifPresent(entity::setFileMetadata);
        }

        EmployeeContractEntity saved = employeeContractRepository.save(entity);
        return employeeContractMapper.toResponse(saved);
    }

    @Transactional
    public EmployeeContractResponse update(Long id, UpdateEmployeeContractRequest request) {
        log.info("Updating contract: {}", id);

        EmployeeContractEntity existing = employeeContractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        employeeContractMapper.updateFromRequest(request, existing);

        EmployeeContractEntity updated = employeeContractRepository.save(existing);
        return employeeContractMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting contract: {}", id);
        if (!employeeContractRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        employeeContractRepository.deleteById(id);
    }

    @Override
    public Page<EmployeeContractResponse> search(EmployeeContractSearchRequest request) {
        log.info("Searching EmployeeContract via specification");
        Specification<EmployeeContractEntity> spec = EmployeeContractSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<EmployeeContractEntity> page = employeeContractRepository.findAll(spec, pageable);
        return page.map(employeeContractMapper::toResponse);
    }


}
