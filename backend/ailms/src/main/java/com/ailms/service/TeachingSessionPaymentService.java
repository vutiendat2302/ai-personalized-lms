package com.ailms.service;

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

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TeachingSessionPaymentService {

    private final TeachingSessionPaymentRepository teachingSessionPaymentRepository;
    private final EmployeeRepository employeeRepository;
    private final TeachingRateRepository teachingRateRepository;
    private final TeachingSessionPaymentMapper teachingSessionPaymentMapper;

    private static final String RESOURCE_NAME = "TeachingSessionPayment";

    public List<TeachingSessionPaymentResponse> getAll() {
        log.info("Getting all session payments");
        return teachingSessionPaymentMapper.toResponseList(teachingSessionPaymentRepository.findAll());
    }

    public TeachingSessionPaymentResponse getById(Long id) {
        log.info("Getting session payment by id: {}", id);
        TeachingSessionPaymentEntity entity = teachingSessionPaymentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return teachingSessionPaymentMapper.toResponse(entity);
    }

    public List<TeachingSessionPaymentResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting session payments for employee: {}", employeeId);
        return teachingSessionPaymentMapper.toResponseList(teachingSessionPaymentRepository.findByEmployee_UserId(employeeId));
    }

    @Transactional
    public TeachingSessionPaymentResponse create(TeachingSessionPaymentRequest request) {
        log.info("Creating session payment for employee: {} and class online: {}", request.getEmployeeId(), request.getClassOnlineId());

        if (teachingSessionPaymentRepository.findByClassOnlineId(request.getClassOnlineId()).isPresent()) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "classOnlineId", request.getClassOnlineId().toString());
        }

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        TeachingRateEntity rate = null;
        if (request.getRateId() != null) {
            rate = teachingRateRepository.findById(request.getRateId())
                    .orElseThrow(() -> ResourceNotFoundException.of("TeachingRate", request.getRateId()));
        }

        TeachingSessionPaymentEntity entity = teachingSessionPaymentMapper.toEntity(request);
        entity.setEmployee(employee);
        entity.setTeachingRate(rate);

        TeachingSessionPaymentEntity saved = teachingSessionPaymentRepository.save(entity);
        return teachingSessionPaymentMapper.toResponse(saved);
    }

    @Transactional
    public TeachingSessionPaymentResponse update(Long id, TeachingSessionPaymentRequest request) {
        log.info("Updating session payment: {}", id);

        TeachingSessionPaymentEntity existing = teachingSessionPaymentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (!existing.getClassOnlineId().equals(request.getClassOnlineId()) &&
                teachingSessionPaymentRepository.findByClassOnlineId(request.getClassOnlineId()).isPresent()) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "classOnlineId", request.getClassOnlineId().toString());
        }

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        TeachingRateEntity rate = null;
        if (request.getRateId() != null) {
            rate = teachingRateRepository.findById(request.getRateId())
                    .orElseThrow(() -> ResourceNotFoundException.of("TeachingRate", request.getRateId()));
        }

        teachingSessionPaymentMapper.updateFromRequest(request, existing);
        existing.setEmployee(employee);
        existing.setTeachingRate(rate);

        TeachingSessionPaymentEntity updated = teachingSessionPaymentRepository.save(existing);
        return teachingSessionPaymentMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting session payment: {}", id);
        if (!teachingSessionPaymentRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        teachingSessionPaymentRepository.deleteById(id);
    }
}
