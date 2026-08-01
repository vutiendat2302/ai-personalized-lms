package com.ailms.service.imp;

import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.entity.AttendanceEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.WorkShiftEntity;
import com.ailms.entity.enums.*;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ForbiddenException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.AttendanceMapper;
import com.ailms.repository.AttendanceRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.LeaveRequestRepository;
import com.ailms.repository.UserRepository;
import com.ailms.repository.WorkShiftRepository;
import com.ailms.repository.specification.AttendanceSpecification;
import com.ailms.request.AttendanceSearchRequest;
import com.ailms.request.CreateAttendanceRequest;
import com.ailms.request.SimulateAttendanceRequest;
import com.ailms.request.UpdateAttendanceRequest;
import com.ailms.response.*;
import com.ailms.service.IAttendanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.env.Environment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AttendanceService implements IAttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final WorkShiftRepository workShiftRepository;
    private final UserRepository userRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AttendanceMapper attendanceMapper;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final Environment environment;

    private static final String RESOURCE_NAME = "Attendance";
    private static final LocalTime WORK_START_MORNING_TIME = LocalTime.of(8, 0);
    private static final LocalTime WORK_END_AFTERNOON_TIME = LocalTime.of(17, 0);

    /** Bổ sung thông tin nhân viên và ca làm vào dữ liệu chấm công trả về. */
    private AttendanceResponse mapToResponseEnhanced(AttendanceEntity entity) {
        AttendanceResponse resp = attendanceMapper.toResponse(entity);
        if (entity.getApprovedBy() != null) {
            userRepository.findById(entity.getApprovedBy()).ifPresent(u -> 
                resp.setApprovedByName(u.getFullName() != null ? u.getFullName() : u.getUsername())
            );
        }
        return resp;
    }

    @Override
    public List<AttendanceResponse> getAll() {
        log.info("Getting all attendance records");
        return attendanceRepository.findAll().stream()
                .map(this::mapToResponseEnhanced)
                .toList();
    }

    @Override
    public AttendanceResponse getById(Long id) {
        log.info("Getting attendance record by id: {}", id);
        AttendanceEntity entity = attendanceRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return mapToResponseEnhanced(entity);
    }

    @Override
    public List<AttendanceResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting attendance records for employee: {}", employeeId);
        return attendanceRepository.findByEmployee_UserId(employeeId).stream()
                .map(this::mapToResponseEnhanced)
                .toList();
    }

    @Override
    public PageResponse<AttendanceResponse> search(AttendanceSearchRequest request) {
        log.info("Searching Attendance via specification");
        Specification<AttendanceEntity> spec = AttendanceSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<AttendanceEntity> page = attendanceRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponseEnhanced));
    }

    /** Tổng hợp chỉ số và xu hướng chấm công trong khoảng thời gian được chọn. */
    @Override
    public AttendanceSummaryResponse getSummary(LocalDate fromDate, LocalDate toDate, Long departmentId) {
        LocalDate today = LocalDate.now();
        LocalDate start = fromDate != null ? fromDate : today.minusDays(6);
        LocalDate end = toDate != null ? toDate : today;

        List<AttendanceEntity> rangeRecords = attendanceRepository.findByWorkDateBetween(start, end);

        if (departmentId != null) {
            rangeRecords = rangeRecords.stream()
                    .filter(a -> a.getEmployee() != null 
                            && a.getEmployee().getDepartment() != null 
                            && departmentId.equals(a.getEmployee().getDepartment().getId()))
                    .toList();
        }

        List<EmployeeEntity> activeEmployees = employeeRepository.findAll().stream()
                .filter(e -> e.getStatus() == EmployeeStatusEnum.ACTIVE)
                .filter(e -> departmentId == null || (e.getDepartment() != null && departmentId.equals(e.getDepartment().getId())))
                .toList();

        long totalEmployees = activeEmployees.size();

        List<AttendanceEntity> todayRecords = attendanceRepository.findByWorkDate(today);
        if (departmentId != null) {
            todayRecords = todayRecords.stream()
                    .filter(a -> a.getEmployee() != null 
                            && a.getEmployee().getDepartment() != null 
                            && departmentId.equals(a.getEmployee().getDepartment().getId()))
                    .toList();
        }

        long presentCount = rangeRecords.stream().filter(a -> a.getStatus() == AttendanceStatusEnum.PRESENT).count();
        long lateCount = rangeRecords.stream().filter(a -> a.getStatus() == AttendanceStatusEnum.LATE || a.getStatus() == AttendanceStatusEnum.PRESENT_LATE).count();
        long absentCount = rangeRecords.stream().filter(a -> a.getStatus() == AttendanceStatusEnum.ABSENT).count();
        long onLeaveCount = rangeRecords.stream().filter(a -> a.getStatus() == AttendanceStatusEnum.ON_LEAVE).count();

        // Overtime minutes calculation
        long totalOtMinutes = rangeRecords.stream()
                .filter(a -> a.getOvertimeMinutes() != null)
                .mapToLong(AttendanceEntity::getOvertimeMinutes)
                .sum();
        double totalOtHours = Math.round((totalOtMinutes / 60.0) * 10.0) / 10.0;

        // Group late count by department
        Map<String, Long> lateByDept = rangeRecords.stream()
                .filter(a -> a.getStatus() == AttendanceStatusEnum.LATE || a.getStatus() == AttendanceStatusEnum.PRESENT_LATE)
                .collect(Collectors.groupingBy(
                        a -> (a.getEmployee() != null && a.getEmployee().getDepartment() != null && a.getEmployee().getDepartment().getName() != null) 
                             ? a.getEmployee().getDepartment().getName() : "Khác",
                        Collectors.counting()
                ));

        // Weekly trend points
        List<DailyTrendPoint> trend = new ArrayList<>();
        LocalDate curr = start;
        DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("dd/MM");

        while (!curr.isAfter(end)) {
            LocalDate d = curr;
            List<AttendanceEntity> dayList = rangeRecords.stream()
                    .filter(a -> d.equals(a.getWorkDate()))
                    .toList();

            long p = dayList.stream().filter(a -> a.getStatus() == AttendanceStatusEnum.PRESENT).count();
            long l = dayList.stream().filter(a -> a.getStatus() == AttendanceStatusEnum.LATE || a.getStatus() == AttendanceStatusEnum.PRESENT_LATE).count();
            long ab = dayList.stream().filter(a -> a.getStatus() == AttendanceStatusEnum.ABSENT).count();
            long ol = dayList.stream().filter(a -> a.getStatus() == AttendanceStatusEnum.ON_LEAVE).count();

            String label = getDayOfWeekLabel(d) + " " + d.format(dayFmt);
            trend.add(DailyTrendPoint.builder()
                    .date(d)
                    .dayLabel(label)
                    .presentCount(p)
                    .lateCount(l)
                    .absentCount(ab)
                    .onLeaveCount(ol)
                    .build());

            curr = curr.plusDays(1);
        }

        return AttendanceSummaryResponse.builder()
                .totalEmployeesToday(totalEmployees)
                .presentCount(presentCount)
                .lateCount(lateCount)
                .absentCount(absentCount)
                .onLeaveCount(onLeaveCount)
                .totalOvertimeHoursThisWeek(totalOtHours)
                .lateCountByDepartment(lateByDept)
                .weeklyTrend(trend)
                .build();
    }

    private String getDayOfWeekLabel(LocalDate date) {
        return switch (date.getDayOfWeek()) {
            case MONDAY -> "T2";
            case TUESDAY -> "T3";
            case WEDNESDAY -> "T4";
            case THURSDAY -> "T5";
            case FRIDAY -> "T6";
            case SATURDAY -> "T7";
            case SUNDAY -> "CN";
        };
    }

    @Transactional
    @Override
    public AttendanceResponse checkIn(Long employeeId, String note) {
        log.info("Check-in request for employee: {}", employeeId);

        EmployeeEntity employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", employeeId));

        if (employee.getUserEntity().getStatus() == UserStatusEnum.DELETED || employee.getStatus() == EmployeeStatusEnum.TERMINATED) {
            throw new BusinessException("Employee is inactive/deleted/terminated. Cannot check-in.");
        }

        LocalDate today = LocalDate.now();
        Optional<AttendanceEntity> existingOpt = attendanceRepository.findByEmployee_UserIdAndWorkDate(employeeId, today);
        if (existingOpt.isPresent() && existingOpt.get().getCheckInTime() != null) {
            throw new BusinessException("Nhân viên đã check-in cho ngày hôm nay.");
        }

        LocalDateTime now = LocalDateTime.now();
        AttendanceStatusEnum initialStatus = computeStatusOnCheckIn(employeeId, now);

        AttendanceEntity entity = existingOpt.orElseGet(() -> AttendanceEntity.builder()
                .employee(employee)
                .workDate(today)
                .source(AttendanceSourceEnum.DEVICE)
                .build());

        entity.setCheckInTime(now);
        entity.setStatus(initialStatus);
        if (note != null && !note.isBlank()) {
            entity.setNote(note);
        }

        calculateMinutes(entity);

        AttendanceEntity saved = attendanceRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CHECK_IN", "ATTENDANCE", saved.getId(), null, saved));
        return mapToResponseEnhanced(saved);
    }

    @Transactional
    @Override
    public AttendanceResponse checkOut(Long employeeId, String note) {
        log.info("Check-out request for employee: {}", employeeId);
        LocalDate today = LocalDate.now();

        AttendanceEntity existing = attendanceRepository.findByEmployee_UserIdAndWorkDate(employeeId, today)
                .orElseThrow(() -> new BusinessException("Chưa tìm thấy bản ghi check-in cho hôm nay."));

        if (existing.getCheckOutTime() != null) {
            throw new DuplicateResourceException("Nhân viên đã check-out.");
        }

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
        calculateMinutes(existing);

        AttendanceEntity saved = attendanceRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CHECK_OUT", "ATTENDANCE", saved.getId(), null, saved));
        return mapToResponseEnhanced(saved);
    }

    @Transactional
    @Override
    public AttendanceResponse create(CreateAttendanceRequest request) {
        log.info("Creating manual attendance for employee: {}", request.getEmployeeId());

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        if (employee.getUserEntity().getStatus() == UserStatusEnum.DELETED || employee.getStatus() == EmployeeStatusEnum.TERMINATED) {
            throw new BusinessException("Employee is inactive/deleted/terminated. Cannot create attendance.");
        }

        LocalDate workDate = request.getCheckInTime() != null ? request.getCheckInTime().toLocalDate() : LocalDate.now();
        if (attendanceRepository.findByEmployee_UserIdAndWorkDate(employee.getUserId(), workDate).isPresent()) {
            throw new BusinessException("Đã tồn tại bản ghi chấm công cho nhân viên trong ngày " + workDate);
        }

        AttendanceEntity entity = attendanceMapper.toEntity(request);
        entity.setEmployee(employee);
        entity.setWorkDate(workDate);
        entity.setSource(AttendanceSourceEnum.MANUAL);

        if (entity.getCheckInTime() == null) {
            entity.setCheckInTime(LocalDateTime.now());
        }

        if (entity.getCheckOutTime() != null && !entity.getCheckOutTime().isAfter(entity.getCheckInTime())) {
            throw new BusinessException("Check-out time must be after check-in time.");
        }

        if (entity.getCheckOutTime() != null) {
            entity.setStatus(computeFinalStatus(entity));
        }

        calculateMinutes(entity);

        AttendanceEntity saved = attendanceRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "ATTENDANCE", saved.getId(), null, saved));
        return mapToResponseEnhanced(saved);
    }

    @Transactional
    @Override
    public AttendanceResponse update(Long id, UpdateAttendanceRequest request) {
        log.info("Updating attendance record: {}", id);

        AttendanceEntity existing = attendanceRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        // Rule 3: Block edit if already approved
        if (existing.getApprovedAt() != null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isAdmin = auth != null && auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (!isAdmin) {
                throw new BusinessException("Bản ghi chấm công đã được phê duyệt. Chỉ Admin cấp cao mới có quyền điều chỉnh.");
            }
        }

        // Rule 2: Note is required for manual edit
        if (request.getNote() == null || request.getNote().isBlank()) {
            throw new BusinessException("Ghi chú là bắt buộc khi thực hiện chỉnh sửa thủ công.");
        }

        String oldValue = SimpleJsonWriter.toJson(existing);

        if (request.getWorkDate() != null) {
            existing.setWorkDate(request.getWorkDate());
        }
        if (request.getWorkShiftId() != null) {
            WorkShiftEntity shift = workShiftRepository.findById(request.getWorkShiftId())
                    .orElseThrow(() -> ResourceNotFoundException.of("WorkShift", request.getWorkShiftId()));
            existing.setWorkShift(shift);
        }

        if (request.getCheckInTime() != null) {
            existing.setCheckInTime(request.getCheckInTime());
        }
        if (request.getCheckOutTime() != null) {
            existing.setCheckOutTime(request.getCheckOutTime());
        }

        if (existing.getCheckInTime() != null && existing.getCheckOutTime() != null
                && !existing.getCheckOutTime().isAfter(existing.getCheckInTime())) {
            throw new BusinessException("Check-out time must be after check-in time.");
        }

        if (request.getStatus() != null) {
            existing.setStatus(request.getStatus());
        } else if (existing.getCheckInTime() != null && existing.getCheckOutTime() != null) {
            existing.setStatus(computeFinalStatus(existing));
        }

        existing.setNote(request.getNote());
        existing.setSource(AttendanceSourceEnum.MANUAL);
        calculateMinutes(existing);

        AttendanceEntity updated = attendanceRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "ATTENDANCE", id, oldValue, updated));
        return mapToResponseEnhanced(updated);
    }

    @Transactional
    @Override
    public AttendanceResponse approve(Long id) {
        log.info("Approving manual attendance record: {}", id);
        AttendanceEntity entity = attendanceRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        Long currentUserId = getCurrentUserId();
        entity.setApprovedBy(currentUserId);
        entity.setApprovedAt(LocalDateTime.now());

        AttendanceEntity saved = attendanceRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "APPROVE", "ATTENDANCE", id, null, saved));
        return mapToResponseEnhanced(saved);
    }

    @Transactional
    @Override
    public void bulkApprove(List<Long> ids) {
        log.info("Bulk approving attendance records: {}", ids);
        if (ids == null || ids.isEmpty()) return;

        Long currentUserId = getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();

        List<AttendanceEntity> list = attendanceRepository.findAllById(ids);
        for (AttendanceEntity entity : list) {
            entity.setApprovedBy(currentUserId);
            entity.setApprovedAt(now);
            attendanceRepository.save(entity);
            applicationEventPublisher.publishEvent(new AuditLogEvent(this, "BULK_APPROVE", "ATTENDANCE", entity.getId(), null, entity));
        }
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            return userRepository.findByUsernameOrEmail(auth.getName())
                    .map(UserEntity::getId)
                    .orElse(1L);
        }
        return 1L;
    }

    /** Sinh dữ liệu chấm công mô phỏng phục vụ kiểm thử và trình diễn. */
    @Transactional
    @Override
    public int simulate(SimulateAttendanceRequest request) {
        log.info("Simulating attendance data from {} to {}", request.getFromDate(), request.getToDate());

        if (request.getFromDate().isAfter(request.getToDate())) {
            throw new BusinessException("fromDate không thể sau toDate.");
        }

        // Rule 5: Block endpoint in production if active profile is prod
        String[] profiles = environment.getActiveProfiles();
        if (Arrays.asList(profiles).contains("prod") || Arrays.asList(profiles).contains("production")) {
            throw new ForbiddenException("Tính năng sinh dữ liệu giả lập bị khóa ở môi trường Production.");
        }

        WorkShiftEntity defaultShift = workShiftRepository.findByName("Ca hành chính")
                .orElseGet(() -> workShiftRepository.save(WorkShiftEntity.builder()
                        .name("Ca hành chính")
                        .startTime(LocalTime.of(8, 0))
                        .endTime(LocalTime.of(17, 0))
                        .breakStartTime(LocalTime.of(12, 0))
                        .breakEndTime(LocalTime.of(13, 0))
                        .note("Ca hành chính cố định 8h-17h")
                        .build()));

        List<EmployeeEntity> employees;
        if (request.getEmployeeIds() != null && !request.getEmployeeIds().isEmpty()) {
            employees = employeeRepository.findAllById(request.getEmployeeIds());
        } else {
            employees = employeeRepository.findAll().stream()
                    .filter(e -> e.getStatus() == null || e.getStatus() == EmployeeStatusEnum.ACTIVE)
                    .filter(e -> e.getEmploymentTypeEnum() == null || e.getEmploymentTypeEnum() == EmploymentTypeEnum.FULL_TIME)
                    .toList();
        }

        if (employees.isEmpty()) {
            throw new BusinessException("Không tìm thấy nhân viên nào để sinh dữ liệu chấm công.");
        }

        Random random = new Random(42); // Consistent seed for realistic demo
        int createdCount = 0;

        LocalDate curr = request.getFromDate();
        while (!curr.isAfter(request.getToDate())) {
            final LocalDate workDate = curr;
            // Skip weekends unless specifically desired
            if (curr.getDayOfWeek().getValue() <= 5) {
                for (EmployeeEntity emp : employees) {
                    Optional<AttendanceEntity> existingOpt = attendanceRepository.findByEmployee_UserIdAndWorkDate(emp.getUserId(), workDate);

                    if (existingOpt.isPresent()) {
                        AttendanceEntity existing = existingOpt.get();
                        // Rule 4: Do not overwrite DEVICE or MANUAL source records unless explicit
                        if (!request.isOverwriteExisting() || existing.getSource() == AttendanceSourceEnum.DEVICE || existing.getSource() == AttendanceSourceEnum.MANUAL) {
                            continue;
                        }
                    }

                    AttendanceEntity record = existingOpt.orElseGet(() -> AttendanceEntity.builder()
                            .employee(emp)
                            .workDate(workDate)
                            .workShift(defaultShift)
                            .build());

                    int chance = random.nextInt(100);

                    if (chance < 80) {
                        // 80% Present (Check-in 07:45 - 08:00, Check-out 17:00 - 17:30)
                        int inOffset = random.nextInt(16); // 0 to 15 mins before 8:00
                        int outOffset = random.nextInt(31); // 0 to 30 mins after 17:00

                        record.setCheckInTime(LocalDateTime.of(curr, LocalTime.of(7, 45).plusMinutes(inOffset)));
                        record.setCheckOutTime(LocalDateTime.of(curr, LocalTime.of(17, 0).plusMinutes(outOffset)));
                        record.setStatus(AttendanceStatusEnum.PRESENT);
                        record.setNote("Điểm danh tự động giả lập (Đúng giờ)");
                    } else if (chance < 92) {
                        // 12% Late (Check-in 08:10 - 09:00, Check-out 17:00 - 17:30)
                        int lateMins = 10 + random.nextInt(50); // 10 to 60 mins late
                        int outOffset = random.nextInt(31);

                        record.setCheckInTime(LocalDateTime.of(curr, LocalTime.of(8, 0).plusMinutes(lateMins)));
                        record.setCheckOutTime(LocalDateTime.of(curr, LocalTime.of(17, 0).plusMinutes(outOffset)));
                        record.setStatus(AttendanceStatusEnum.LATE);
                        record.setNote("Đến muộn " + lateMins + " phút (Giả lập demo)");
                    } else if (chance < 97) {
                        // 5% On Leave
                        record.setCheckInTime(null);
                        record.setCheckOutTime(null);
                        record.setStatus(AttendanceStatusEnum.ON_LEAVE);
                        record.setNote("Nghỉ phép cá nhân được duyệt");
                    } else {
                        // 3% Absent
                        record.setCheckInTime(null);
                        record.setCheckOutTime(null);
                        record.setStatus(AttendanceStatusEnum.ABSENT);
                        record.setNote("Vắng mặt không lý do");
                    }

                    record.setSource(AttendanceSourceEnum.SIMULATED);
                    calculateMinutes(record);
                    attendanceRepository.save(record);
                    createdCount++;
                }
            }
            curr = curr.plusDays(1);
        }

        return createdCount;
    }

    @Override
    /** Xuất danh sách chấm công theo đúng bộ lọc hiện tại. */
    public byte[] exportCsv(AttendanceSearchRequest request) {
        log.info("Exporting attendance report CSV");
        Specification<AttendanceEntity> spec = AttendanceSpecification.filterAndSearch(request);
        List<AttendanceEntity> list = attendanceRepository.findAll(spec);

        StringBuilder csv = new StringBuilder();
        csv.append("\uFEFF"); // UTF-8 BOM for Excel compatibility
        csv.append("ID,Mã Nhân Viên,Họ Và Tên,Phòng Ban,Ngày Công,Ca Làm Việc,Giờ Vào,Giờ Ra,Số Phút Làm,Số Phút Muộn,Số Phút Về Sớm,Số Phút OT,Trạng Thái,Nguồn,Ghi Chú\n");

        DateTimeFormatter dFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter tFmt = DateTimeFormatter.ofPattern("HH:mm:ss");

        for (AttendanceEntity a : list) {
            String empCode = a.getEmployee() != null ? a.getEmployee().getEmployeeCode() : "";
            String empName = (a.getEmployee() != null && a.getEmployee().getUserEntity() != null) ? a.getEmployee().getUserEntity().getFullName() : "";
            String deptName = (a.getEmployee() != null && a.getEmployee().getDepartment() != null) ? a.getEmployee().getDepartment().getName() : "";
            String dateStr = a.getWorkDate() != null ? a.getWorkDate().format(dFmt) : "";
            String shiftName = a.getWorkShift() != null ? a.getWorkShift().getName() : "Ca hành chính";
            String inStr = a.getCheckInTime() != null ? a.getCheckInTime().format(tFmt) : "";
            String outStr = a.getCheckOutTime() != null ? a.getCheckOutTime().format(tFmt) : "";
            String noteSanitized = a.getNote() != null ? a.getNote().replace(",", " ").replace("\n", " ") : "";

            csv.append(String.format("%s,%s,%s,%s,%s,%s,%s,%s,%d,%d,%d,%d,%s,%s,%s\n",
                    a.getId(),
                    empCode,
                    empName,
                    deptName,
                    dateStr,
                    shiftName,
                    inStr,
                    outStr,
                    a.getWorkedMinutes() != null ? a.getWorkedMinutes() : 0,
                    a.getLateMinutes() != null ? a.getLateMinutes() : 0,
                    a.getEarlyLeaveMinutes() != null ? a.getEarlyLeaveMinutes() : 0,
                    a.getOvertimeMinutes() != null ? a.getOvertimeMinutes() : 0,
                    a.getStatus(),
                    a.getSource(),
                    noteSanitized
            ));
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional
    @Override
    public void delete(Long id) {
        log.info("Deleting (cancelling) attendance record: {}", id);
        AttendanceEntity entity = attendanceRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        String oldValue = SimpleJsonWriter.toJson(entity);
        attendanceRepository.delete(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "ATTENDANCE", id, oldValue, null));
    }

    @Transactional
    @Override
    public AttendanceResponse updateStatus(Long id, AttendanceStatusEnum status) {
        log.info("Updating attendance status manually: id={}, newStatus={}", id, status);
        if (status == null) {
            throw new BusinessException("Status is required.");
        }

        AttendanceEntity existing = attendanceRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        String oldValue = SimpleJsonWriter.toJson(existing);
        existing.setStatus(status);
        existing.setSource(AttendanceSourceEnum.MANUAL);

        AttendanceEntity updated = attendanceRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE_STATUS", "ATTENDANCE", id, oldValue, updated));
        return mapToResponseEnhanced(updated);
    }

    /** Tính phút làm việc, đi muộn, về sớm và tăng ca theo ca được gán. */
    private void calculateMinutes(AttendanceEntity entity) {
        if (entity.getCheckInTime() != null && entity.getCheckOutTime() != null) {
            long totalMins = Duration.between(entity.getCheckInTime(), entity.getCheckOutTime()).toMinutes();
            entity.setWorkedMinutes((int) Math.max(0, totalMins));
        } else {
            entity.setWorkedMinutes(0);
        }

        LocalTime shiftStart = entity.getWorkShift() != null ? entity.getWorkShift().getStartTime() : WORK_START_MORNING_TIME;
        LocalTime shiftEnd = entity.getWorkShift() != null ? entity.getWorkShift().getEndTime() : WORK_END_AFTERNOON_TIME;

        if (entity.getCheckInTime() != null) {
            LocalTime inTime = entity.getCheckInTime().toLocalTime();
            if (inTime.isAfter(shiftStart)) {
                entity.setLateMinutes((int) Duration.between(shiftStart, inTime).toMinutes());
            } else {
                entity.setLateMinutes(0);
            }
        } else {
            entity.setLateMinutes(0);
        }

        if (entity.getCheckOutTime() != null) {
            LocalTime outTime = entity.getCheckOutTime().toLocalTime();
            if (outTime.isBefore(shiftEnd)) {
                entity.setEarlyLeaveMinutes((int) Duration.between(outTime, shiftEnd).toMinutes());
                entity.setOvertimeMinutes(0);
            } else {
                entity.setEarlyLeaveMinutes(0);
                entity.setOvertimeMinutes((int) Duration.between(shiftEnd, outTime).toMinutes());
            }
        } else {
            entity.setEarlyLeaveMinutes(0);
            entity.setOvertimeMinutes(0);
        }
    }

    private AttendanceStatusEnum computeStatusOnCheckIn(Long employeeId, LocalDateTime checkInTime) {
        LocalDate date = checkInTime.toLocalDate();
        boolean hasApprovedLeave = !leaveRequestRepository
                .findActiveLeaveOnDate(employeeId, LeaveStatusEnum.APPROVED, date)
                .isEmpty();
        if (hasApprovedLeave) {
            return AttendanceStatusEnum.ON_LEAVE;
        }

        LocalTime inTime = checkInTime.toLocalTime();
        if (inTime.isAfter(WORK_START_MORNING_TIME)) {
            return AttendanceStatusEnum.LATE;
        }
        return AttendanceStatusEnum.PRESENT;
    }

    private AttendanceStatusEnum computeFinalStatus(AttendanceEntity entity) {
        if (entity.getCheckInTime() == null || entity.getCheckOutTime() == null) {
            return AttendanceStatusEnum.ABSENT;
        }

        LocalDate date = entity.getWorkDate() != null ? entity.getWorkDate() : entity.getCheckInTime().toLocalDate();
        boolean hasApprovedLeave = entity.getEmployee() != null && !leaveRequestRepository
                .findActiveLeaveOnDate(entity.getEmployee().getUserId(), LeaveStatusEnum.APPROVED, date)
                .isEmpty();
        if (hasApprovedLeave) {
            return AttendanceStatusEnum.ON_LEAVE;
        }

        long durationHours = Duration.between(entity.getCheckInTime(), entity.getCheckOutTime()).toHours();
        LocalTime inTime = entity.getCheckInTime().toLocalTime();
        long lateMins = Duration.between(WORK_START_MORNING_TIME, inTime).toMinutes();

        if (durationHours >= 8 && lateMins <= 0) {
            return AttendanceStatusEnum.PRESENT;
        } else if (durationHours >= 8) {
            return AttendanceStatusEnum.PRESENT_LATE;
        } else if (durationHours >= 4 && lateMins <= 0) {
            return AttendanceStatusEnum.HALF_DAY;
        } else if (durationHours >= 4) {
            return AttendanceStatusEnum.HALF_DAY_LATE;
        } else {
            return AttendanceStatusEnum.ABSENT;
        }
    }
}
