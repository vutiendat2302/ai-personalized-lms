package com.ailms.service.imp;
import com.ailms.entity.ClassOnlineEntity;
import com.ailms.repository.ClassOnlineRepository;
import com.ailms.repository.specification.TeachingSessionPaymentSpecification;
import com.ailms.request.CreateTeachingSessionPaymentRequest;
import com.ailms.request.TeachingSessionPaymentSearchRequest;
import com.ailms.request.UpdateTeachingSessionPaymentRequest;
import com.ailms.service.ITeachingSessionPaymentService;


import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.TeachingRateEntity;
import com.ailms.entity.TeachingSessionPaymentEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.TeachingSessionPaymentMapper;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.TeachingRateRepository;
import com.ailms.repository.TeachingSessionPaymentRepository;
import com.ailms.response.TeachingSessionPaymentResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TeachingSessionPaymentService implements ITeachingSessionPaymentService {

    private final TeachingSessionPaymentRepository teachingSessionPaymentRepository;
    private final EmployeeRepository employeeRepository;
    private final TeachingRateRepository teachingRateRepository;
    private final TeachingSessionPaymentMapper teachingSessionPaymentMapper;

    private static final String RESOURCE_NAME = "TeachingSessionPayment";
    private final ClassOnlineRepository classOnlineRepository;

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
    public TeachingSessionPaymentResponse create(CreateTeachingSessionPaymentRequest request) {
        log.info("Creating session payment for employee: {} and class online: {}", request.getEmployeeId(), request.getClassOnlineId());


        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        TeachingRateEntity rate = null;
        if (request.getRateId() != null) {
            rate = teachingRateRepository.findById(request.getRateId())
                    .orElseThrow(() -> ResourceNotFoundException.of("TeachingRate", request.getRateId()));
        }

        ClassOnlineEntity classOnline = null;
        if (request.getClassOnlineId() != null) {
            classOnline = classOnlineRepository.findById(request.getClassOnlineId())
                    .orElseThrow(() -> ResourceNotFoundException.of("ClassOnline", request.getClassOnlineId()));
        }

        TeachingSessionPaymentEntity entity = teachingSessionPaymentMapper.toEntity(request);
        entity.setEmployee(employee);
        entity.setTeachingRate(rate);
        entity.setClassOnline(classOnline);

        TeachingSessionPaymentEntity saved = teachingSessionPaymentRepository.save(entity);
        return teachingSessionPaymentMapper.toResponse(saved);
    }

    @Transactional
    public TeachingSessionPaymentResponse update(Long id, UpdateTeachingSessionPaymentRequest request) {
        log.info("Updating session payment: {}", id);
        TeachingSessionPaymentEntity existing = teachingSessionPaymentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (request.getClassOnlineId() != null
                && !existing.getClassOnline().getId().equals(request.getClassOnlineId())
                && teachingSessionPaymentRepository.findByClassOnlineId(request.getClassOnlineId()).isPresent()) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "classOnlineId", request.getClassOnlineId().toString());
        }

        if (request.getEmployeeId() != null) {
            EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));
            existing.setEmployee(employee);
        }

        if (request.getRateId() != null) {
            TeachingRateEntity rate = teachingRateRepository.findById(request.getRateId())
                    .orElseThrow(() -> ResourceNotFoundException.of("TeachingRate", request.getRateId()));
            existing.setTeachingRate(rate);
        }

        if (request.getClassOnlineId() != null) {
            ClassOnlineEntity classOnline = classOnlineRepository.findById(request.getClassOnlineId())
                    .orElseThrow(() -> ResourceNotFoundException.of("ClassOnline", request.getClassOnlineId()));
            existing.setClassOnline(classOnline);
        }

        teachingSessionPaymentMapper.updateFromRequest(request, existing);

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

    @Override
    public Page<TeachingSessionPaymentResponse> search(TeachingSessionPaymentSearchRequest request) {
        log.info("Searching TeachingSessionPayment via specification");
        Specification<TeachingSessionPaymentEntity> spec = TeachingSessionPaymentSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<TeachingSessionPaymentEntity> page = teachingSessionPaymentRepository.findAll(spec, pageable);
        return page.map(teachingSessionPaymentMapper::toResponse);
    }
}
