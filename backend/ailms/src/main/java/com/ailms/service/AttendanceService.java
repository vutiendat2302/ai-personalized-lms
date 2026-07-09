package com.ailms.service;

import com.ailms.entity.AttendanceEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.AttendanceMapper;
import com.ailms.repository.AttendanceRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.request.AttendanceRequest;
import com.ailms.response.AttendanceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceMapper attendanceMapper;

    private static final String RESOURCE_NAME = "Attendance";

    public List<AttendanceResponse> getAll() {
        log.info("Getting all attendance records");
        return attendanceMapper.toResponseList(attendanceRepository.findAll());
    }

    public AttendanceResponse getById(Long id) {
        log.info("Getting attendance record by id: {}", id);
        AttendanceEntity entity = attendanceRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return attendanceMapper.toResponse(entity);
    }

    public List<AttendanceResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting attendance records for employee: {}", employeeId);
        return attendanceMapper.toResponseList(attendanceRepository.findByEmployee_UserId(employeeId));
    }

    @Transactional
    public AttendanceResponse create(AttendanceRequest request) {
        log.info("Creating attendance for employee: {}", request.getEmployeeId());

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        AttendanceEntity entity = attendanceMapper.toEntity(request);
        entity.setEmployee(employee);

        AttendanceEntity saved = attendanceRepository.save(entity);
        return attendanceMapper.toResponse(saved);
    }

    @Transactional
    public AttendanceResponse update(Long id, AttendanceRequest request) {
        log.info("Updating attendance record: {}", id);

        AttendanceEntity existing = attendanceRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        attendanceMapper.updateFromRequest(request, existing);
        existing.setEmployee(employee);

        AttendanceEntity updated = attendanceRepository.save(existing);
        return attendanceMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting attendance record: {}", id);
        if (!attendanceRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        attendanceRepository.deleteById(id);
    }
}
