package com.ailms.service.imp;

import com.ailms.entity.CourseProgressEntity;
import com.ailms.entity.AttendanceEntity;
import com.ailms.entity.ApprovalRequestEntity;
import com.ailms.entity.EmployeeContractEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.LeaveRequestEntity;
import com.ailms.entity.OrderEntity;
import com.ailms.entity.StudentProfileEntity;
import com.ailms.entity.enums.ApprovalStatusEnum;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BadRequestException;
import com.ailms.exception.ForbiddenException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.CourseProgressRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.DepartmentRepository;
import com.ailms.repository.AttendanceRepository;
import com.ailms.repository.ApprovalRequestRepository;
import com.ailms.repository.EmployeeContractRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.LeaveRequestRepository;
import com.ailms.repository.OrderRepository;
import com.ailms.repository.StudentProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/** Cấp context nghiệp vụ read-only cho AI sau khi kiểm tra quyền Admin hoặc HR. */
@Service
@RequiredArgsConstructor
public class ManagementAiContextService {

    private static final int DEFAULT_LIMIT = 10;
    private static final int MAX_LIMIT = 20;

    private final EmployeeRepository employeeRepository;
    private final EmployeeContractRepository employeeContractRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final ApprovalRequestRepository approvalRequestRepository;
    private final OrderRepository orderRepository;
    private final CourseRepository courseRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseProgressRepository courseProgressRepository;
    private final DepartmentRepository departmentRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final AiNotificationActionService aiNotificationActionService;

    /** Thực thi đúng một tool allow-list và ghi audit metadata không chứa dữ liệu nhạy cảm. */
    @Transactional(readOnly = true)
    public Map<String, Object> execute(
            String toolName, Map<String, Object> arguments, AiToolAccessContext context) {
        Map<String, Object> result = switch (toolName) {
            case "get_system_overview" -> withAdminOrHr(context, this::systemOverview);
            case "search_employees" -> withAdminOrHr(context, () -> searchEmployees(arguments));
            case "get_employee_contracts" -> withAdminOrHr(context, () -> employeeContracts(arguments));
            case "search_students" -> withAdminOrHr(context, () -> searchStudents(arguments));
            case "get_student_learning_summary" -> withAdminOrHr(context, () -> studentLearningSummary(arguments));
            case "get_hr_operations_summary" -> withAdminOrHr(context, () -> hrOperationsSummary(arguments));
            case "analyze_attendance_trend" -> withAdminOrHr(context, () -> attendanceTrend(arguments));
            case "list_expiring_contracts" -> withAdminOrHr(context, () -> expiringContracts(arguments));
            case "list_pending_approvals" -> withAdminOrHr(context, () -> pendingApprovals(arguments));
            case "get_order_summary" -> withAdmin(context, this::orderSummary);
            case "get_course_catalog_summary" -> withAdmin(context, this::courseCatalogSummary);
            case "analyze_learning_progress" -> withAdminOrHr(context, () -> learningProgressAnalysis(arguments));
            case "draft_notification" -> notificationDraft(arguments, context);
            default -> throw new BadRequestException("Tool AI không được hỗ trợ");
        };
        applicationEventPublisher.publishEvent(new AuditLogEvent(
                this, "AI_TOOL_EXECUTED", "ManagementAiTool", context.ownerId(), null,
                Map.of("toolName", toolName)));
        return result;
    }

    /** Trả số liệu tổng quan thật của những module đã có dữ liệu hệ thống. */
    private Map<String, Object> systemOverview() {
        return Map.of(
                "companyProfileConfigured", false,
                "companyProfileNote", "Hệ thống chưa có hồ sơ công ty được lưu tập trung.",
                "employeeCount", employeeRepository.countByUserEntity_StatusNot(UserStatusEnum.DELETED),
                "studentCount", studentProfileRepository.countStudentsByStatus(UserStatusEnum.ACTIVE),
                "contractCount", employeeContractRepository.count(),
                "departmentCount", departmentRepository.countActiveDepartments());
    }

    /** Tìm danh sách nhân viên tối thiểu theo mã, tên hoặc phòng ban. */
    private Map<String, Object> searchEmployees(Map<String, Object> arguments) {
        String keyword = optionalString(arguments, "keyword");
        int limit = limit(arguments);
        List<Map<String, Object>> employees = employeeRepository
                .findAllByUserEntity_StatusNot(UserStatusEnum.DELETED).stream()
                .filter(employee -> containsEmployee(employee, keyword))
                .limit(limit)
                .map(this::employeeSummary)
                .toList();
        return Map.of("count", employees.size(), "employees", employees);
    }

    /** Lấy danh sách hợp đồng của đúng một nhân viên, không gửi lương sang Gemini. */
    private Map<String, Object> employeeContracts(Map<String, Object> arguments) {
        EmployeeEntity employee = resolveEmployee(arguments);
        List<Map<String, Object>> contracts = employeeContractRepository
                .findByEmployee_UserId(employee.getUserId()).stream()
                .map(this::contractSummary)
                .toList();
        return Map.of("employee", employeeSummary(employee), "contracts", contracts);
    }

    /** Tìm học viên theo mã hoặc tên mà không gửi PII không cần thiết ra ngoài. */
    private Map<String, Object> searchStudents(Map<String, Object> arguments) {
        String keyword = optionalString(arguments, "keyword");
        int limit = limit(arguments);
        List<Map<String, Object>> students = studentProfileRepository.findAll().stream()
                .filter(student -> student.getUserEntity().getStatus() != UserStatusEnum.DELETED)
                .filter(student -> containsStudent(student, keyword))
                .limit(limit)
                .map(this::studentSummary)
                .toList();
        return Map.of("count", students.size(), "students", students);
    }

    /** Tổng hợp tiến độ học thật của một học viên qua enrollment và course progress. */
    private Map<String, Object> studentLearningSummary(Map<String, Object> arguments) {
        StudentProfileEntity student = resolveStudent(arguments);
        List<Map<String, Object>> progress = courseProgressRepository.findByUserId(student.getUserId()).stream()
                .map(this::progressSummary)
                .toList();
        List<Map<String, Object>> enrollments = enrollmentRepository.findByUserEntity_Id(student.getUserId()).stream()
                .map(this::enrollmentSummary)
                .toList();
        return Map.of("student", studentSummary(student), "progress", progress, "enrollments", enrollments);
    }

    /** Tóm tắt chấm công và đơn nghỉ của một ngày mà không gửi ghi chú hoặc lý do cá nhân. */
    private Map<String, Object> hrOperationsSummary(Map<String, Object> arguments) {
        LocalDate date = date(arguments, "date", LocalDate.now());
        List<AttendanceEntity> attendance = attendanceRepository.findByWorkDate(date);
        Map<String, Long> attendanceByStatus = attendance.stream().collect(java.util.stream.Collectors.groupingBy(
                item -> String.valueOf(item.getStatus()), LinkedHashMap::new, java.util.stream.Collectors.counting()));
        long pendingLeaves = leaveRequestRepository.findAll().stream()
                .filter(item -> item.getStatus() == com.ailms.entity.enums.LeaveStatusEnum.PENDING)
                .count();
        return Map.of(
                "date", date.toString(),
                "attendanceCount", attendance.size(),
                "attendanceByStatus", attendanceByStatus,
                "pendingLeaveRequestCount", pendingLeaves);
    }

    /** Phân tích chấm công theo khoảng tối đa 90 ngày bằng số lượng và phút muộn đã aggregate. */
    private Map<String, Object> attendanceTrend(Map<String, Object> arguments) {
        LocalDate toDate = date(arguments, "toDate", LocalDate.now());
        LocalDate fromDate = date(arguments, "fromDate", toDate.minusDays(29));
        if (fromDate.isAfter(toDate) || java.time.temporal.ChronoUnit.DAYS.between(fromDate, toDate) > 89) {
            throw new BadRequestException("Khoảng phân tích chấm công phải từ 1 đến 90 ngày");
        }
        List<AttendanceEntity> attendance = attendanceRepository.findByWorkDateBetween(fromDate, toDate);
        Map<String, Long> byStatus = attendance.stream().collect(java.util.stream.Collectors.groupingBy(
                item -> String.valueOf(item.getStatus()), LinkedHashMap::new, java.util.stream.Collectors.counting()));
        long lateMinutes = attendance.stream()
                .map(AttendanceEntity::getLateMinutes)
                .filter(Objects::nonNull)
                .mapToLong(Integer::longValue)
                .sum();
        return Map.of("fromDate", fromDate.toString(), "toDate", toDate.toString(),
                "recordCount", attendance.size(), "attendanceByStatus", byStatus,
                "totalLateMinutes", lateMinutes);
    }

    /** Liệt kê hợp đồng ACTIVE sắp hết hạn trong số ngày được yêu cầu, không có lương hoặc file. */
    private Map<String, Object> expiringContracts(Map<String, Object> arguments) {
        int daysAhead = positiveInt(arguments, "daysAhead", 30, 180);
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> contracts = employeeContractRepository.findAll().stream()
                .filter(contract -> contract.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(contract -> contract.getEndDate() != null)
                .filter(contract -> !contract.getEndDate().isBefore(today)
                        && !contract.getEndDate().isAfter(today.plusDays(daysAhead)))
                .sorted(java.util.Comparator.comparing(EmployeeContractEntity::getEndDate))
                .limit(MAX_LIMIT)
                .map(contract -> expiringContractSummary(contract, today))
                .toList();
        return Map.of("fromDate", today.toString(), "daysAhead", daysAhead, "contracts", contracts);
    }

    /** Trả hàng đợi approval ở dạng metadata, không trả comment hoặc dữ liệu target nhạy cảm. */
    private Map<String, Object> pendingApprovals(Map<String, Object> arguments) {
        int limit = limit(arguments);
        List<Map<String, Object>> approvals = approvalRequestRepository.findAll().stream()
                .filter(item -> item.getStatus() == ApprovalStatusEnum.PENDING)
                .sorted(java.util.Comparator.comparing(ApprovalRequestEntity::getCreatedAt,
                        java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())))
                .limit(limit)
                .map(item -> Map.<String, Object>of(
                        "approvalId", String.valueOf(item.getId()),
                        "targetType", item.getTargetType(),
                        "targetId", String.valueOf(item.getTargetId()),
                        "level", item.getLevel(),
                        "totalLevels", item.getTotalLevels(),
                        "createdAt", String.valueOf(item.getCreatedAt())))
                .toList();
        return Map.of("count", approvals.size(), "approvals", approvals);
    }

    /** Tổng hợp đơn hàng theo trạng thái chỉ dành cho Admin, không trả đơn hàng hay PII từng học viên. */
    private Map<String, Object> orderSummary() {
        Map<String, Long> countByStatus = orderRepository.findAll().stream().collect(java.util.stream.Collectors.groupingBy(
                item -> String.valueOf(item.getStatus()), LinkedHashMap::new, java.util.stream.Collectors.counting()));
        Map<String, BigDecimal> amountByStatus = orderRepository.findAll().stream().collect(java.util.stream.Collectors.groupingBy(
                item -> String.valueOf(item.getStatus()), LinkedHashMap::new,
                java.util.stream.Collectors.reducing(BigDecimal.ZERO,
                        item -> item.getFinalAmount() == null ? BigDecimal.ZERO : item.getFinalAmount(), BigDecimal::add)));
        return Map.of("orderCountByStatus", countByStatus, "finalAmountByStatus", amountByStatus);
    }

    /** Tổng hợp catalog khóa học theo trạng thái chỉ dành cho Admin. */
    private Map<String, Object> courseCatalogSummary() {
        Map<String, Long> countByStatus = new LinkedHashMap<>();
        for (CourseStatusEnum status : CourseStatusEnum.values()) {
            countByStatus.put(status.name(), courseRepository.countByStatus(status));
        }
        return Map.of("courseCountByStatus", countByStatus);
    }

    /** Tính tỷ lệ tiến độ và số bản ghi chậm tiến độ; không trả danh tính học viên hàng loạt. */
    private Map<String, Object> learningProgressAnalysis(Map<String, Object> arguments) {
        int threshold = positiveInt(arguments, "riskBelowPercent", 50, 100);
        List<CourseProgressEntity> progressRecords = courseProgressRepository.findAll();
        long knownProgressCount = progressRecords.stream().filter(item -> item.getProgressPercent() != null).count();
        double averageProgress = progressRecords.stream()
                .map(CourseProgressEntity::getProgressPercent)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0D);
        long atRiskCount = progressRecords.stream()
                .map(CourseProgressEntity::getProgressPercent)
                .filter(Objects::nonNull)
                .filter(value -> value < threshold)
                .count();
        return Map.of("progressRecordCount", progressRecords.size(), "knownProgressCount", knownProgressCount,
                "averageProgressPercent", Math.round(averageProgress * 100D) / 100D,
                "riskBelowPercent", threshold, "atRiskProgressRecordCount", atRiskCount);
    }

    /** Tạo draft thông báo qua service action và chỉ trả ID, preview, trạng thái cần xác nhận. */
    private Map<String, Object> notificationDraft(
            Map<String, Object> arguments, AiToolAccessContext context) {
        var draft = aiNotificationActionService.createDraft(arguments, context);
        return Map.of("draftId", draft.getDraftId(), "title", draft.getTitle(),
                "content", draft.getContent(), "targetSummary", draft.getTargetSummary(),
                "expiresAt", draft.getExpiresAt(), "requiresConfirmation", draft.isRequiresConfirmation());
    }

    /** Bắt buộc context do Backend ký phải thuộc Admin hoặc HR. */
    private void requireAdminOrHr(AiToolAccessContext context) {
        if (!context.roles().contains("ROLE_ADMIN") && !context.roles().contains("ROLE_HR")) {
            throw new ForbiddenException("Chỉ Admin hoặc HR được hỏi dữ liệu quản trị qua AI");
        }
    }

    /** Bắt buộc tool nhạy cảm về bán hàng hoặc catalog phải do Admin gọi. */
    private void requireAdmin(AiToolAccessContext context) {
        if (!context.roles().contains("ROLE_ADMIN")) {
            throw new ForbiddenException("Chỉ Admin được hỏi dữ liệu này qua AI");
        }
    }

    /** Chạy supplier sau khi xác thực role Admin hoặc HR. */
    private Map<String, Object> withAdminOrHr(
            AiToolAccessContext context, java.util.function.Supplier<Map<String, Object>> supplier) {
        requireAdminOrHr(context);
        return supplier.get();
    }

    /** Chạy supplier sau khi xác thực role Admin. */
    private Map<String, Object> withAdmin(
            AiToolAccessContext context, java.util.function.Supplier<Map<String, Object>> supplier) {
        requireAdmin(context);
        return supplier.get();
    }

    /** Resolve nhân viên theo ID hoặc mã, tránh tiết lộ dữ liệu nếu không có kết quả. */
    private EmployeeEntity resolveEmployee(Map<String, Object> arguments) {
        String employeeId = optionalString(arguments, "employeeId");
        String employeeCode = optionalString(arguments, "employeeCode");
        if (employeeId == null && employeeCode == null) {
            throw new BadRequestException("Tool cần employeeId hoặc employeeCode");
        }
        if (employeeId != null) {
            try {
                return employeeRepository.findById(Long.valueOf(employeeId))
                        .orElseThrow(() -> ResourceNotFoundException.of("Employee", employeeId));
            } catch (NumberFormatException exception) {
                throw new BadRequestException("employeeId không hợp lệ");
            }
        }
        return employeeRepository.findByEmployeeCode(employeeCode)
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", employeeCode));
    }

    /** Resolve học viên theo ID hoặc mã trước khi trả tiến độ. */
    private StudentProfileEntity resolveStudent(Map<String, Object> arguments) {
        String studentId = optionalString(arguments, "studentId");
        String studentCode = optionalString(arguments, "studentCode");
        if (studentId == null && studentCode == null) {
            throw new BadRequestException("Tool cần studentId hoặc studentCode");
        }
        if (studentId != null) {
            try {
                return studentProfileRepository.findById(Long.valueOf(studentId))
                        .orElseThrow(() -> ResourceNotFoundException.of("Student", studentId));
            } catch (NumberFormatException exception) {
                throw new BadRequestException("studentId không hợp lệ");
            }
        }
        return studentProfileRepository.findByStudentCode(studentCode)
                .orElseThrow(() -> ResourceNotFoundException.of("Student", studentCode));
    }

    /** Kiểm tra keyword không phân biệt hoa thường trên field công khai của nhân viên. */
    private boolean containsEmployee(EmployeeEntity employee, String keyword) {
        if (keyword == null) {
            return true;
        }
        String searchable = String.join(" ",
                nullSafe(employee.getEmployeeCode()),
                nullSafe(employee.getUserEntity().getFullName()),
                employee.getDepartment() == null ? "" : nullSafe(employee.getDepartment().getName()));
        return searchable.toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT));
    }

    /** Kiểm tra keyword không phân biệt hoa thường trên mã và tên học viên. */
    private boolean containsStudent(StudentProfileEntity student, String keyword) {
        if (keyword == null) {
            return true;
        }
        String searchable = nullSafe(student.getStudentCode()) + " "
                + nullSafe(student.getUserEntity().getFullName());
        return searchable.toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT));
    }

    /** Chuyển nhân viên sang tập field tối thiểu được phép gửi sang Gemini. */
    private Map<String, Object> employeeSummary(EmployeeEntity employee) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("employeeId", String.valueOf(employee.getUserId()));
        result.put("employeeCode", employee.getEmployeeCode());
        result.put("fullName", employee.getUserEntity().getFullName());
        result.put("department", employee.getDepartment() == null ? null : employee.getDepartment().getName());
        result.put("position", employee.getPosition());
        result.put("employmentType", employee.getEmploymentTypeEnum());
        result.put("employmentStatus", employee.getStatus());
        return result;
    }

    /** Chuyển học viên sang tập field tối thiểu được phép gửi sang Gemini. */
    private Map<String, Object> studentSummary(StudentProfileEntity student) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("studentId", String.valueOf(student.getUserId()));
        result.put("studentCode", student.getStudentCode());
        result.put("fullName", student.getUserEntity().getFullName());
        result.put("educationLevel", student.getEducationLevel());
        result.put("hasGoal", student.getHasGoal());
        result.put("accountStatus", student.getUserEntity().getStatus());
        return result;
    }

    /** Chuyển hợp đồng sang trạng thái và thời hạn tối thiểu, không chứa dữ liệu lương. */
    private Map<String, Object> contractSummary(EmployeeContractEntity contract) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("contractId", String.valueOf(contract.getId()));
        result.put("contractType", contract.getContractTypeEnum());
        result.put("startDate", contract.getStartDate());
        result.put("endDate", contract.getEndDate());
        result.put("status", contract.getStatus());
        result.put("signingStatus", contract.getSigningStatus());
        return result;
    }

    /** Chuyển hợp đồng sắp hết hạn sang DTO rút gọn kèm số ngày còn lại. */
    private Map<String, Object> expiringContractSummary(EmployeeContractEntity contract, LocalDate today) {
        Map<String, Object> result = contractSummary(contract);
        result.put("employeeCode", contract.getEmployee().getEmployeeCode());
        result.put("employeeName", contract.getEmployee().getUserEntity().getFullName());
        result.put("daysUntilExpiry", java.time.temporal.ChronoUnit.DAYS.between(today, contract.getEndDate()));
        return result;
    }

    /** Chuyển tiến độ khóa học sang số liệu đã tính từ Backend. */
    private Map<String, Object> progressSummary(CourseProgressEntity progress) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("courseId", String.valueOf(progress.getCourseId()));
        result.put("progressPercent", progress.getProgressPercent());
        result.put("completedLessons", progress.getCompletedLessons());
        result.put("totalLessons", progress.getTotalLessons());
        result.put("averageQuizScore", progress.getAvgQuizScore());
        result.put("lastAccessedAt", progress.getLastAccessedAt());
        return result;
    }

    /** Chuyển enrollment sang thông tin khóa học tối thiểu phục vụ diễn giải. */
    private Map<String, Object> enrollmentSummary(EnrollmentEntity enrollment) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("enrollmentId", String.valueOf(enrollment.getId()));
        result.put("courseId", String.valueOf(enrollment.getCourseEntity().getId()));
        result.put("courseName", enrollment.getCourseEntity().getName());
        result.put("status", enrollment.getStatus());
        result.put("enrolledAt", enrollment.getEnrolledAt());
        result.put("completedAt", enrollment.getCompletedAt());
        return result;
    }

    /** Đọc string option không rỗng từ tool arguments. */
    private String optionalString(Map<String, Object> arguments, String key) {
        Object value = arguments.get(key);
        if (value == null || String.valueOf(value).isBlank()) {
            return null;
        }
        return String.valueOf(value).trim();
    }

    /** Giới hạn số bản ghi để không gửi lượng dữ liệu lớn sang AI provider. */
    private int limit(Map<String, Object> arguments) {
        Object value = arguments.get("limit");
        if (value == null) {
            return DEFAULT_LIMIT;
        }
        try {
            return Math.min(Math.max(Integer.parseInt(String.valueOf(value)), 1), MAX_LIMIT);
        } catch (NumberFormatException exception) {
            throw new BadRequestException("limit không hợp lệ");
        }
    }

    /** Đọc số nguyên dương có giới hạn trên từ tool arguments. */
    private int positiveInt(Map<String, Object> arguments, String key, int defaultValue, int maxValue) {
        Object value = arguments.get(key);
        if (value == null) {
            return defaultValue;
        }
        try {
            return Math.min(Math.max(Integer.parseInt(String.valueOf(value)), 1), maxValue);
        } catch (NumberFormatException exception) {
            throw new BadRequestException(key + " không hợp lệ");
        }
    }

    /** Đọc ngày ISO-8601 hoặc dùng giá trị mặc định khi caller không truyền. */
    private LocalDate date(Map<String, Object> arguments, String key, LocalDate defaultValue) {
        String value = optionalString(arguments, key);
        if (value == null) {
            return defaultValue;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException exception) {
            throw new BadRequestException(key + " phải theo định dạng yyyy-MM-dd");
        }
    }

    /** Đổi null thành chuỗi rỗng khi xây searchable text. */
    private String nullSafe(String value) {
        return Objects.toString(value, "");
    }
}
