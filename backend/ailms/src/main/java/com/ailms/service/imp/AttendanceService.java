package com.ailms.service.imp;

import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.entity.AttendanceEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.enums.AttendanceStatusEnum;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.LeaveStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ForbiddenException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.AttendanceMapper;
import com.ailms.repository.AttendanceRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.LeaveRequestRepository;
import com.ailms.repository.specification.AttendanceSpecification;
import com.ailms.request.AttendanceSearchRequest;
import com.ailms.request.CreateAttendanceRequest;
import com.ailms.request.UpdateAttendanceRequest;
import com.ailms.response.AttendanceResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.IAttendanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AttendanceService implements IAttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AttendanceMapper attendanceMapper;
    private final ApplicationEventPublisher applicationEventPublisher;

    private static final String RESOURCE_NAME = "Attendance";
    private static final LocalTime WORK_START_TIME = LocalTime.of(8, 0);

    @Override
    public List<AttendanceResponse> getAll() {
        log.info("Getting all attendance records");
        return attendanceMapper.toResponseList(attendanceRepository.findAll());
    }

    @Override
    public AttendanceResponse getById(Long id) {
        log.info("Getting attendance record by id: {}", id);
        AttendanceEntity entity = attendanceRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return attendanceMapper.toResponse(entity);
    }

    @Override
    public List<AttendanceResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting attendance records for employee: {}", employeeId);
        return attendanceMapper.toResponseList(attendanceRepository.findByEmployee_UserId(employeeId));
    }

    @Transactional
    @Override
    public AttendanceResponse checkIn(Long employeeId, String note) {
        log.info("Check-in request for employee: {}", employeeId);

        EmployeeEntity employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", employeeId));

        if (employee.getStatus() == EmployeeStatusEnum.DELETE || employee.getStatus() == EmployeeStatusEnum.TERMINATED) {
            throw new BusinessException("Employee is inactive/deleted/terminated. Cannot check-in.");
        }

        List<AttendanceEntity> openAttendances = attendanceRepository.findByEmployee_UserId(employeeId).stream()
                .filter(a -> a.getCheckOutTime() == null && a.getStatus() != AttendanceStatusEnum.CANCELLED)
                .toList();

        if (!openAttendances.isEmpty()) {
            throw new BusinessException("Nhân viên đang có bản ghi chấm công chưa check-out.");
        }

        LocalDateTime now = LocalDateTime.now();
        AttendanceStatusEnum initialStatus = computeStatusOnCheckIn(employeeId, now);

        AttendanceEntity entity = AttendanceEntity.builder()
                .employee(employee)
                .checkInTime(now)
                .status(initialStatus)
                .note(note)
                .build();

        AttendanceEntity saved = attendanceRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CHECK_IN", "ATTENDANCE", saved.getId(), null, saved));
        return attendanceMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public AttendanceResponse checkOut(Long employeeId, String note) {
        log.info("Check-out request for employee: {}", employeeId);

        List<AttendanceEntity> openAttendances = attendanceRepository.findByEmployee_UserId(employeeId).stream()
                .filter(a -> a.getCheckOutTime() == null && a.getStatus() != AttendanceStatusEnum.CANCELLED)
                .toList();

        if (openAttendances.isEmpty()) {
            throw new BusinessException("Không tìm thấy bản ghi check-in chưa check-out để thực hiện check-out.");
        }

        AttendanceEntity existing = openAttendances.get(0);
        LocalDateTime checkOutTime = LocalDateTime.now();

        if (!checkOutTime.isAfter(existing.getCheckInTime())) {
            throw new BusinessException("Thời gian check-out phải sau thời gian check-in.");
        }

        existing.setCheckOutTime(checkOutTime);
        if (note != null && !note.isBlank()) {
            existing.setNote(existing.getNote() != null ? existing.getNote() + " | " + note : note);
        }

        AttendanceStatusEnum finalStatus = computeFinalStatus(existing);
        existing.setStatus(finalStatus);

        AttendanceEntity saved = attendanceRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CHECK_OUT", "ATTENDANCE", saved.getId(), null, saved));
        return attendanceMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public AttendanceResponse create(CreateAttendanceRequest request) {
        log.info("Creating manual attendance for employee: {}", request.getEmployeeId());

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        if (employee.getStatus() == EmployeeStatusEnum.DELETE || employee.getStatus() == EmployeeStatusEnum.TERMINATED) {
            throw new BusinessException("Employee is inactive/deleted/terminated. Cannot create attendance.");
        }

        AttendanceEntity entity = attendanceMapper.toEntity(request);
        entity.setEmployee(employee);
        if (entity.getCheckInTime() == null) {
            entity.setCheckInTime(LocalDateTime.now());
        }

        if (entity.getCheckOutTime() != null) {
            entity.setStatus(computeFinalStatus(entity));
        }

        AttendanceEntity saved = attendanceRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "ATTENDANCE", saved.getId(), null, saved));
        return attendanceMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public AttendanceResponse update(Long id, UpdateAttendanceRequest request) {
        log.info("Updating attendance record: {}", id);

        AttendanceEntity existing = attendanceRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        String oldValue = SimpleJsonWriter.toJson(existing);
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
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isAdminOrHr = false;
            if (auth != null && auth.isAuthenticated()) {
                isAdminOrHr = auth.getAuthorities().stream()
                        .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                        .anyMatch(a -> a.equals("ROLE_ADMIN") || a.equals("ROLE_HR"));
            }
            if (!isAdminOrHr) {
                throw new ForbiddenException("Only admin or HR can adjust attendance records.");
            }
            if (request.getNote() == null || request.getNote().isBlank()) {
                throw new BusinessException("Note is required for adjusting attendance records.");
            }
        }

        attendanceMapper.updateFromRequest(request, existing);

        if (existing.getCheckOutTime() != null) {
            existing.setStatus(computeFinalStatus(existing));
        }

        AttendanceEntity updated = attendanceRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "ATTENDANCE", id, oldValue, updated));
        return attendanceMapper.toResponse(updated);
    }

    @Transactional
    @Override
    public void delete(Long id) {
        log.info("Deleting (cancelling) attendance record: {}", id);
        AttendanceEntity entity = attendanceRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        String oldValue = SimpleJsonWriter.toJson(entity);
        entity.setStatus(AttendanceStatusEnum.CANCELLED);
        entity.setNote(entity.getNote() != null ? entity.getNote() + " [Cancelled]" : "Cancelled");
        attendanceRepository.save(entity);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "ATTENDANCE", id, oldValue, null));
    }

    @Override
    public PageResponse<AttendanceResponse> search(AttendanceSearchRequest request) {
        log.info("Searching Attendance via specification");
        Specification<AttendanceEntity> spec = AttendanceSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<AttendanceEntity> page = attendanceRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(attendanceMapper::toResponse));
    }

    private AttendanceStatusEnum computeStatusOnCheckIn(Long employeeId, LocalDateTime checkInTime) {
        LocalDate date = checkInTime.toLocalDate();
        boolean hasApprovedLeave = !leaveRequestRepository.findActiveLeaveOnDate(employeeId, LeaveStatusEnum.APPROVED, date).isEmpty();
        if (hasApprovedLeave) {
            return AttendanceStatusEnum.ON_LEAVE;
        }

        LocalTime checkInTimeOfDay = checkInTime.toLocalTime();
        long minutesLate = Duration.between(WORK_START_TIME, checkInTimeOfDay).toMinutes();

        if (minutesLate <= 0) {
            return AttendanceStatusEnum.PRESENT;
        } else if (minutesLate <= 60) {
            return AttendanceStatusEnum.LATE;
        } else {
            // Check-in trễ > 1h: không tính công buổi đó
            return AttendanceStatusEnum.LATE;
        }
    }

    private AttendanceStatusEnum computeFinalStatus(AttendanceEntity entity) {
        LocalDate date = entity.getCheckInTime().toLocalDate();
        boolean hasApprovedLeave = !leaveRequestRepository.findActiveLeaveOnDate(entity.getEmployee().getUserId(), LeaveStatusEnum.APPROVED, date).isEmpty();
        if (hasApprovedLeave) {
            return AttendanceStatusEnum.ON_LEAVE;
        }

        if (entity.getCheckInTime() == null || entity.getCheckOutTime() == null) {
            return AttendanceStatusEnum.ABSENT;
        }

        LocalTime checkInTimeOfDay = entity.getCheckInTime().toLocalTime();
        long minutesLate = Duration.between(WORK_START_TIME, checkInTimeOfDay).toMinutes();
        long durationHours = Duration.between(entity.getCheckInTime(), entity.getCheckOutTime()).toHours();

        if (minutesLate > 60) {
            // Check-in trễ > 1h: không tính công buổi đó
            return AttendanceStatusEnum.LATE;
        }

        if (durationHours >= 8) {
            return minutesLate > 0 ? AttendanceStatusEnum.LATE : AttendanceStatusEnum.PRESENT;
        } else if (durationHours >= 4) {
            return AttendanceStatusEnum.HALF_DAY;
        } else {
            return AttendanceStatusEnum.ABSENT;
        }
    }
}
