package com.ailms.service.imp;

import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.TeacherAvailabilityEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.TeacherAvailabilityMapper;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.TeacherAvailabilityRepository;
import com.ailms.request.TeacherAvailabilityRequest;
import com.ailms.request.UpdateTeacherAvailabilityRequest;
import com.ailms.response.TeacherAvailabilityResponse;
import com.ailms.service.ITeacherAvailabilityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TeacherAvailabilityService implements ITeacherAvailabilityService {

    private final TeacherAvailabilityRepository teacherAvailabilityRepository;
    private final EmployeeRepository employeeRepository;
    private final TeacherAvailabilityMapper teacherAvailabilityMapper;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Transactional
    @Override
    public TeacherAvailabilityResponse addTeacherAvailability(TeacherAvailabilityRequest request) {
        log.info("Adding availability for teacher employee: {} on day {}", request.getEmployeeId(), request.getDayOfWeek());

        if (request.getStartTime().isAfter(request.getEndTime()) || request.getStartTime().equals(request.getEndTime())) {
            throw new BusinessException("Start time must be before end time");
        }

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        TeacherAvailabilityEntity availability = teacherAvailabilityMapper.toEntity(request);
        availability.setEmployeeEntity(employee);
        availability.setStatus(BaseStatusEnum.ACTIVE);

        TeacherAvailabilityEntity saved = teacherAvailabilityRepository.save(availability);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "ADD_TEACHER_AVAILABILITY", "TEACHER_AVAILABILITY", saved.getId(), null, saved));

        return teacherAvailabilityMapper.toResponse(saved);
    }

    @Override
    public TeacherAvailabilityResponse getTeacherAvailabilityById(Long id) {
        log.info("Getting teacher availability by ID: {}", id);
        TeacherAvailabilityEntity entity = teacherAvailabilityRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("TeacherAvailability", id));
        return teacherAvailabilityMapper.toResponse(entity);
    }

    @Override
    public List<TeacherAvailabilityResponse> getTeacherAvailabilitiesByEmployeeId(Long employeeId) {
        log.info("Getting teacher availabilities for employee: {}", employeeId);
        List<TeacherAvailabilityEntity> availabilities = teacherAvailabilityRepository.findByEmployeeEntity_UserId(employeeId);
        return teacherAvailabilityMapper.toResponseList(availabilities);
    }

    @Transactional
    @Override
    public TeacherAvailabilityResponse updateTeacherAvailability(Long id, UpdateTeacherAvailabilityRequest request) {
        log.info("Updating teacher availability ID: {}", id);

        TeacherAvailabilityEntity availability = teacherAvailabilityRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("TeacherAvailability", id));

        teacherAvailabilityMapper.updateFromRequest(request, availability);

        if (availability.getStartTime().isAfter(availability.getEndTime()) || availability.getStartTime().equals(availability.getEndTime())) {
            throw new BusinessException("Start time must be before end time");
        }

        TeacherAvailabilityEntity updated = teacherAvailabilityRepository.save(availability);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE_TEACHER_AVAILABILITY", "TEACHER_AVAILABILITY", updated.getId(), null, updated));

        return teacherAvailabilityMapper.toResponse(updated);
    }

    @Transactional
    @Override
    public void deleteTeacherAvailability(Long id) {
        log.info("Deleting teacher availability ID: {}", id);

        TeacherAvailabilityEntity availability = teacherAvailabilityRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("TeacherAvailability", id));

        availability.setStatus(BaseStatusEnum.INACTIVE);
        teacherAvailabilityRepository.save(availability);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE_TEACHER_AVAILABILITY", "TEACHER_AVAILABILITY", id, null, availability));
    }
}
