package com.ailms.service;

import com.ailms.request.CreateSalaryRequest;
import com.ailms.request.UpdateSalaryRequest;
import org.springframework.data.domain.Page;
import com.ailms.request.SalarySearchRequest;
import com.ailms.response.SalaryResponse;
import java.util.List;

public interface ISalaryService {
    Page<SalaryResponse> search(SalarySearchRequest request);
    List<SalaryResponse> getAll();
    SalaryResponse getById(Long id);
    List<SalaryResponse> getByEmployeeId(Long employeeId);
    SalaryResponse create(CreateSalaryRequest request);
    SalaryResponse update(Long id, UpdateSalaryRequest request);
    void delete(Long id);
}
