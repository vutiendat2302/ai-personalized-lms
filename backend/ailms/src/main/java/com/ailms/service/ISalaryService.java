package com.ailms.service;

import com.ailms.request.CreateSalaryRequest;
import com.ailms.request.UpdateSalaryRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.SalarySearchRequest;
import com.ailms.response.SalaryResponse;
import java.util.List;

public interface ISalaryService {
    PageResponse<SalaryResponse> search(SalarySearchRequest request);
    List<SalaryResponse> getAll();
    SalaryResponse getById(Long id);
    List<SalaryResponse> getByEmployeeId(Long employeeId);
    SalaryResponse create(CreateSalaryRequest request);
    SalaryResponse update(Long id, UpdateSalaryRequest request);
    void delete(Long id);
    SalaryResponse approve(Long id);
    SalaryResponse pay(Long id);
}
