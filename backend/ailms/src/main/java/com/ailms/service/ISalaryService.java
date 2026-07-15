package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.SalarySearchRequest;
import com.ailms.response.SalaryResponse;


import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.SalaryEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.SalaryMapper;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.SalaryRepository;
import com.ailms.request.SalaryRequest;
import com.ailms.response.SalaryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface ISalaryService {
    Page<SalaryResponse> search(SalarySearchRequest request);
    List<SalaryResponse> getAll();
    SalaryResponse getById(Long id);
    List<SalaryResponse> getByEmployeeId(Long employeeId);
    SalaryResponse create(SalaryRequest request);
    SalaryResponse update(Long id, SalaryRequest request);
    void delete(Long id);
}
