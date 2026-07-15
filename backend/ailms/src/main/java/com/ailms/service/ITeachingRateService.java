package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.TeachingRateSearchRequest;
import com.ailms.response.TeachingRateResponse;


import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.TeachingRateEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.TeachingRateMapper;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.TeachingRateRepository;
import com.ailms.request.TeachingRateRequest;
import com.ailms.response.TeachingRateResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface ITeachingRateService {
    Page<TeachingRateResponse> search(TeachingRateSearchRequest request);
    List<TeachingRateResponse> getAll();
    TeachingRateResponse getById(Long id);
    List<TeachingRateResponse> getByEmployeeId(Long employeeId);
    TeachingRateResponse create(TeachingRateRequest request);
    TeachingRateResponse update(Long id, TeachingRateRequest request);
    void delete(Long id);
}
