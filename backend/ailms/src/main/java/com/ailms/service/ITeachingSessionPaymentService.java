package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.TeachingSessionPaymentSearchRequest;
import com.ailms.response.TeachingSessionPaymentResponse;


import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.TeachingRateEntity;
import com.ailms.entity.TeachingSessionPaymentEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.TeachingSessionPaymentMapper;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.TeachingRateRepository;
import com.ailms.repository.TeachingSessionPaymentRepository;
import com.ailms.request.TeachingSessionPaymentRequest;
import com.ailms.response.TeachingSessionPaymentResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface ITeachingSessionPaymentService {
    Page<TeachingSessionPaymentResponse> search(TeachingSessionPaymentSearchRequest request);
    List<TeachingSessionPaymentResponse> getAll();
    TeachingSessionPaymentResponse getById(Long id);
    List<TeachingSessionPaymentResponse> getByEmployeeId(Long employeeId);
    TeachingSessionPaymentResponse create(TeachingSessionPaymentRequest request);
    TeachingSessionPaymentResponse update(Long id, TeachingSessionPaymentRequest request);
    void delete(Long id);
}
