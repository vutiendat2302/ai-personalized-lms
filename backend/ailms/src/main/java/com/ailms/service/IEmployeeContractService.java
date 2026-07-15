package com.ailms.service;

import com.ailms.request.CreateEmployeeContractRequest;
import com.ailms.request.UpdateEmployeeContractRequest;
import org.springframework.data.domain.Page;
import com.ailms.request.EmployeeContractSearchRequest;
import com.ailms.response.EmployeeContractResponse;
import java.util.List;

public interface IEmployeeContractService {
    Page<EmployeeContractResponse> search(EmployeeContractSearchRequest request);
    List<EmployeeContractResponse> getAll();
    EmployeeContractResponse getById(Long id);
    List<EmployeeContractResponse> getByEmployeeId(Long employeeId);
    EmployeeContractResponse create(CreateEmployeeContractRequest request);
    EmployeeContractResponse update(Long id, UpdateEmployeeContractRequest request);
    void delete(Long id);
}
