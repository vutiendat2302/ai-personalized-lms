package com.ailms.service;

import com.ailms.request.CreateTeachingSessionPaymentRequest;
import com.ailms.request.UpdateTeachingSessionPaymentRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.TeachingSessionPaymentSearchRequest;
import com.ailms.response.TeachingSessionPaymentResponse;

import java.util.List;

public interface ITeachingSessionPaymentService {
    PageResponse<TeachingSessionPaymentResponse> search(TeachingSessionPaymentSearchRequest request);
    List<TeachingSessionPaymentResponse> getAll();
    TeachingSessionPaymentResponse getById(Long id);
    List<TeachingSessionPaymentResponse> getByEmployeeId(Long employeeId);
    TeachingSessionPaymentResponse create(CreateTeachingSessionPaymentRequest request);
    TeachingSessionPaymentResponse update(Long id, UpdateTeachingSessionPaymentRequest request);
    void delete(Long id);
}
