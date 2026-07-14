package com.ailms.service;

import com.ailms.entity.EmployeeContractEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.EmployeeContractMapper;
import com.ailms.repository.EmployeeContractRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.FileMetadataRepository;
import com.ailms.request.EmployeeContractRequest;
import com.ailms.response.EmployeeContractResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class EmployeeContractService {

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
    public EmployeeContractResponse create(EmployeeContractRequest request) {
        log.info("Creating contract for employee: {}", request.getEmployeeId());

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        EmployeeContractEntity entity = employeeContractMapper.toEntity(request);
        entity.setEmployee(employee);

        if (request.getFileUrl() != null) {
            fileMetadataRepository.findByFileUrl(request.getFileUrl())
                    .ifPresent(entity::setFileMetadata);
        }

        EmployeeContractEntity saved = employeeContractRepository.save(entity);
        return employeeContractMapper.toResponse(saved);
    }

    @Transactional
    public EmployeeContractResponse update(Long id, EmployeeContractRequest request) {
        log.info("Updating contract: {}", id);

        EmployeeContractEntity existing = employeeContractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        employeeContractMapper.updateFromRequest(request, existing);
        existing.setEmployee(employee);

        if (request.getFileUrl() != null) {
            fileMetadataRepository.findByFileUrl(request.getFileUrl())
                    .ifPresentOrElse(
                            existing::setFileMetadata,
                            () -> existing.setFileMetadata(null)
                    );
        } else {
            existing.setFileMetadata(null);
        }

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
}
