package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.EmployeeSearchRequest;
import com.ailms.response.EmployeeResponse;


import com.ailms.request.CreateEmployeeRequest;
import com.ailms.request.UpdateEmployeeRequest;
import com.ailms.response.EmployeeResponse;

import java.util.List;

public interface IEmployeeService {
    PageResponse<EmployeeResponse> search (EmployeeSearchRequest request);
    List<EmployeeResponse> getAll();
    EmployeeResponse getById(Long id);
    EmployeeResponse create(CreateEmployeeRequest request);
    EmployeeResponse update(Long id, UpdateEmployeeRequest request);
    void softDelete(Long id);
    EmployeeResponse terminate(Long id);
}
