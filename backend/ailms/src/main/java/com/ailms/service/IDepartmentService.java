package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.DepartmentResponse;
import com.ailms.response.PageResponse;

import java.util.List;

public interface IDepartmentService {

    DepartmentResponse createDepartment(CreateDepartmentRequest request);

    DepartmentResponse updateDepartment(Long id, UpdateDepartmentRequest request);

    void delete(Long id);

    DepartmentResponse getDepartmentById(Long id);

    List<DepartmentResponse> getDepartments();

    PageResponse<DepartmentResponse> search(DepartmentSearchRequest request);
}
