package com.ailms.service;

import com.ailms.request.CreateTeachingRateRequest;
import com.ailms.request.UpdateTeachingRateRequest;
import org.springframework.data.domain.Page;
import com.ailms.request.TeachingRateSearchRequest;
import com.ailms.response.TeachingRateResponse;


import java.util.List;

public interface ITeachingRateService {
    Page<TeachingRateResponse> search(TeachingRateSearchRequest request);
    List<TeachingRateResponse> getAll();
    TeachingRateResponse getById(Long id);
    List<TeachingRateResponse> getByEmployeeId(Long employeeId);
    TeachingRateResponse create(CreateTeachingRateRequest request);
    TeachingRateResponse update(Long id, UpdateTeachingRateRequest request);
    void delete(Long id);
}
