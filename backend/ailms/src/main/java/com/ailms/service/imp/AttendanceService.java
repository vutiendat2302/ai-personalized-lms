package com.ailms.service.imp;
import com.ailms.request.CreateAttendanceRequest;
import com.ailms.request.UpdateAttendanceRequest;
import com.ailms.service.IAttendanceService;


import com.ailms.entity.AttendanceEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.AttendanceMapper;
import com.ailms.repository.AttendanceRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.specification.AttendanceSpecification;
import com.ailms.request.AttendanceSearchRequest;
import com.ailms.response.AttendanceResponse;
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
public class AttendanceService implements IAttendanceService {
    @Override
    public Page<AttendanceResponse> search(AttendanceSearchRequest request) {
        log.info("Searching Attendance via specification");
        Specification<AttendanceEntity> spec = AttendanceSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<AttendanceEntity> page = attendanceRepository.findAll(spec, pageable);
        return page.map(attendanceMapper::toResponse);
    }


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
    public AttendanceResponse create(CreateAttendanceRequest request) {
        log.info("Creating attendance for employee: {}", request.getEmployeeId());

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        AttendanceEntity entity = attendanceMapper.toEntity(request);
        entity.setEmployee(employee);

        AttendanceEntity saved = attendanceRepository.save(entity);
        return attendanceMapper.toResponse(saved);
    }

    @Transactional
    public AttendanceResponse update(Long id, UpdateAttendanceRequest request) {
        log.info("Updating attendance record: {}", id);

        AttendanceEntity existing = attendanceRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        attendanceMapper.updateFromRequest(request, existing);

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
