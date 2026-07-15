package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.EmployeeSearchRequest;
import com.ailms.response.EmployeeResponse;


import com.ailms.request.CreateEmployeeRequest;
import com.ailms.request.UpdateEmployeeRequest;
import com.ailms.response.EmployeeResponse;

import java.util.List;

public interface IEmployeeService {
    Page<EmployeeResponse> search(EmployeeSearchRequest request);
    List<EmployeeResponse> getAll();
    EmployeeResponse getById(Long id);
    EmployeeResponse create(CreateEmployeeRequest request);
    EmployeeResponse update(Long id, UpdateEmployeeRequest request);
    void delete(Long id);
}
