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
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDateTime;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.AttendanceStatusEnum;
import com.ailms.exception.BusinessException;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AttendanceService implements IAttendanceService {

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

        if (employee.getStatus() == EmployeeStatusEnum.DELETE || employee.getStatus() == EmployeeStatusEnum.TERMINATED) {
            throw new BusinessException("Employee is inactive/deleted/terminated. Cannot check-in.");
        }

        // Check if employee has any open attendance (checkOutTime is null)
        List<AttendanceEntity> openAttendances = attendanceRepository.findByEmployee_UserId(employee.getUserId()).stream()
                .filter(a -> a.getCheckOutTime() == null)
                .toList();
        if (!openAttendances.isEmpty()) {
            throw new BusinessException("Nhân viên đang có bản ghi chấm công chưa check-out.");
        }

        AttendanceEntity entity = attendanceMapper.toEntity(request);
        entity.setEmployee(employee);
        entity.setCheckInTime(LocalDateTime.now());

        AttendanceEntity saved = attendanceRepository.save(entity);
        return attendanceMapper.toResponse(saved);
    }

    @Transactional
    public AttendanceResponse update(Long id, UpdateAttendanceRequest request) {
        log.info("Updating attendance record: {}", id);

        AttendanceEntity existing = attendanceRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        LocalDateTime checkIn = request.getCheckInTime() != null ? request.getCheckInTime() : existing.getCheckInTime();
        LocalDateTime checkOut = request.getCheckOutTime() != null ? request.getCheckOutTime() : existing.getCheckOutTime();
        if (checkOut != null && checkIn != null && !checkOut.isAfter(checkIn)) {
            throw new BusinessException("Check-out time must be after check-in time.");
        }

        boolean isAdjustment = false;
        if (request.getCheckInTime() != null && !request.getCheckInTime().equals(existing.getCheckInTime())) {
            isAdjustment = true;
        }
        if (existing.getCheckOutTime() != null && request.getCheckOutTime() != null && !request.getCheckOutTime().equals(existing.getCheckOutTime())) {
            isAdjustment = true;
        }

        if (isAdjustment) {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            boolean isAdminOrHr = false;
            if (auth != null && auth.isAuthenticated()) {
                isAdminOrHr = auth.getAuthorities().stream()
                        .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                        .anyMatch(a -> a.equals("ROLE_ADMIN") || a.equals("ROLE_HR"));
            }
            if (!isAdminOrHr) {
                throw new com.ailms.exception.ForbiddenException("Only admin or HR can adjust attendance records.");
            }
            if (request.getNote() == null || request.getNote().isBlank()) {
                throw new BusinessException("Note is required for adjusting attendance records.");
            }
        }

        attendanceMapper.updateFromRequest(request, existing);

        AttendanceEntity updated = attendanceRepository.save(existing);
        return attendanceMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting (cancelling) attendance record: {}", id);
        AttendanceEntity entity = attendanceRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        entity.setStatus(AttendanceStatusEnum.CANCELLED);
        entity.setNote(entity.getNote() != null ? entity.getNote() + " [Cancelled]" : "Cancelled");
        attendanceRepository.save(entity);
    }

    @Override
    public PageResponse<AttendanceResponse> search(AttendanceSearchRequest request) {
        log.info("Searching Attendance via specification");
        Specification<AttendanceEntity> spec = AttendanceSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<AttendanceEntity> page = attendanceRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(attendanceMapper::toResponse));
    }
}
