package com.ailms.service.imp;
import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.entity.ClassEntity;
import com.ailms.event.AuditLogEvent;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.specification.TeachingRateSpecification;
import com.ailms.request.CreateTeachingRateRequest;
import com.ailms.request.TeachingRateSearchRequest;
import com.ailms.request.UpdateTeachingRateRequest;
import com.ailms.service.ITeachingRateService;


import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.TeachingRateEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.TeachingRateMapper;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.TeachingRateRepository;
import com.ailms.response.TeachingRateResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDateTime;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.exception.BusinessException;
import com.ailms.repository.TeachingSessionPaymentRepository;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TeachingRateService implements ITeachingRateService {

    private final TeachingRateRepository teachingRateRepository;
    private final EmployeeRepository employeeRepository;
    private final TeachingRateMapper teachingRateMapper;
    private final ClassRepository classRepository;
    private final TeachingSessionPaymentRepository teachingSessionPaymentRepository;

    private static final String RESOURCE_NAME = "TeachingRate";
    private final ApplicationEventPublisher applicationEventPublisher;

    public List<TeachingRateResponse> getAll() {
        log.info("Getting all teaching rates");
        return teachingRateMapper.toResponseList(teachingRateRepository.findAll());
    }

    public TeachingRateResponse getById(Long id) {
        log.info("Getting teaching rate by id: {}", id);
        TeachingRateEntity entity = teachingRateRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return teachingRateMapper.toResponse(entity);
    }

    public List<TeachingRateResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting teaching rates for employee: {}", employeeId);
        return teachingRateMapper.toResponseList(teachingRateRepository.findByEmployeeEntity_UserId(employeeId));
    }

    @Transactional
    public TeachingRateResponse create(CreateTeachingRateRequest request) {
        log.info("Creating teaching rate for employee: {}", request.getEmployeeId());

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        if (employee.getStatus() == EmployeeStatusEnum.DELETE) {
            throw new BusinessException("Employee is deleted. Cannot create teaching rate.");
        }

        ClassEntity classEntity = classRepository.findById(request.getClassId())
                .orElseThrow(() -> ResourceNotFoundException.of("Class", request.getClassId()));

        if (request.getRate() == null || request.getRate().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Rate must be greater than 0.");
        }

        if (request.getEffectiveFrom() == null) {
            throw new BusinessException("Effective From date-time is required.");
        }

        if (request.getEffectiveTo() != null && !request.getEffectiveTo().isAfter(request.getEffectiveFrom())) {
            throw new BusinessException("Effective To must be after Effective From.");
        }

        BaseStatusEnum status = BaseStatusEnum.ACTIVE;
        validateAndManageRateOverlap(request.getEmployeeId(), request.getClassId(), request.getEffectiveFrom(), request.getEffectiveTo(), null);

        TeachingRateEntity entity = teachingRateMapper.toEntity(request);
        entity.setEmployeeEntity(employee);
        entity.setClassEntity(classEntity);
        entity.setStatus(status);

        TeachingRateEntity saved = teachingRateRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "TEACHING_RATE", saved.getId(), null, saved));
        return teachingRateMapper.toResponse(saved);
    }

    @Transactional
    public TeachingRateResponse update(Long id, UpdateTeachingRateRequest request) {
        log.info("Updating teaching rate: {}", id);

        TeachingRateEntity existing = teachingRateRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        String oldValue = SimpleJsonWriter.toJson(existing);
        if (request.getEmployeeId() != null && !request.getEmployeeId().equals(existing.getEmployeeEntity().getUserId())) {
            throw new BusinessException("Cannot change employee ID of a teaching rate.");
        }

        if (request.getClassId() != null && !request.getClassId().equals(existing.getClassEntity().getId())) {
            throw new BusinessException("Cannot change class ID of a teaching rate.");
        }

        if (request.getRate() != null && request.getRate().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Rate must be greater than 0.");
        }

        LocalDateTime newFrom = request.getEffectiveFrom() != null ? request.getEffectiveFrom() : existing.getEffectiveFrom();
        LocalDateTime newTo = request.getEffectiveTo() != null ? request.getEffectiveTo() : existing.getEffectiveTo();

        if (newTo != null && !newTo.isAfter(newFrom)) {
            throw new BusinessException("Effective To must be after Effective From.");
        }

        BaseStatusEnum status = request.getStatus() != null ? request.getStatus() : existing.getStatus();
        if (status == BaseStatusEnum.ACTIVE) {
            validateAndManageRateOverlap(existing.getEmployeeEntity().getUserId(), existing.getClassEntity().getId(), newFrom, newTo, existing.getId());
        }

        teachingRateMapper.updateFromRequest(request, existing);

        TeachingRateEntity updated = teachingRateRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "TEACHING_RATE", id, oldValue, updated));
        return teachingRateMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting teaching rate: {}", id);
        TeachingRateEntity rate = teachingRateRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        String oldValue = SimpleJsonWriter.toJson(rate);
        boolean isUsed = teachingSessionPaymentRepository.existsByTeachingRate_Id(id);
        if (isUsed) {
            // Soft delete
            rate.setStatus(BaseStatusEnum.INACTIVE);
            teachingRateRepository.save(rate);
            log.info("Teaching rate is in use by payments. Soft deleted (status set to INACTIVE).");
        } else {
            // Hard delete
            teachingRateRepository.delete(rate);
            log.info("Teaching rate is not in use. Hard deleted from database.");
        }

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "TEACHING_RATE", id, oldValue, null));
    }

    @Override
    public PageResponse<TeachingRateResponse> search(TeachingRateSearchRequest request) {
        log.info("Searching TeachingRate via specification");
        Specification<TeachingRateEntity> spec = TeachingRateSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<TeachingRateEntity> page = teachingRateRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(teachingRateMapper::toResponse));
    }

    private void validateAndManageRateOverlap(Long employeeId, Long classId, LocalDateTime newFrom, LocalDateTime newTo, Long currentRateId) {
        List<TeachingRateEntity> activeRates = teachingRateRepository.findByEmployeeEntity_UserId(employeeId).stream()
                .filter(r -> r.getClassEntity() != null && r.getClassEntity().getId().equals(classId))
                .filter(r -> r.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(r -> currentRateId == null || !r.getId().equals(currentRateId))
                .toList();

        for (TeachingRateEntity r : activeRates) {
            boolean overlaps = (r.getEffectiveTo() == null || !newFrom.isAfter(r.getEffectiveTo()))
                    && (newTo == null || !newTo.isBefore(r.getEffectiveFrom()));

            if (overlaps) {
                if (r.getEffectiveFrom().isBefore(newFrom)) {
                    // Auto-close the old rate
                    r.setEffectiveTo(newFrom.minusSeconds(1));
                    r.setStatus(BaseStatusEnum.INACTIVE);
                    teachingRateRepository.save(r);
                } else {
                    throw new BusinessException("Trùng lấn thời gian với đơn giá hiệu lực khác.");
                }
            }
        }
    }

}
