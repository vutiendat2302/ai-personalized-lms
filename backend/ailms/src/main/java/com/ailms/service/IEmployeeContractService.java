package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.EmployeeContractSearchRequest;
import com.ailms.response.EmployeeContractResponse;


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

public interface IEmployeeContractService {
    Page<EmployeeContractResponse> search(EmployeeContractSearchRequest request);
    List<EmployeeContractResponse> getAll();
    EmployeeContractResponse getById(Long id);
    List<EmployeeContractResponse> getByEmployeeId(Long employeeId);
    EmployeeContractResponse create(EmployeeContractRequest request);
    EmployeeContractResponse update(Long id, EmployeeContractRequest request);
    void delete(Long id);
}
