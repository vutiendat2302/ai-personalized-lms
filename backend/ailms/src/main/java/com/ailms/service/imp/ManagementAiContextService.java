package com.ailms.service.imp;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.CourseProgressEntity;
import com.ailms.entity.CourseSectionEntity;
import com.ailms.entity.LessonEntity;
import com.ailms.entity.LessonResourceEntity;
import com.ailms.entity.AttendanceEntity;
import com.ailms.entity.ApprovalRequestEntity;
import com.ailms.entity.CouponEntity;
import com.ailms.entity.EmployeeContractEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.LeaveRequestEntity;
import com.ailms.entity.OrderEntity;
import com.ailms.entity.StudentProfileEntity;
import com.ailms.entity.UserCouponEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.ApprovalStatusEnum;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.entity.enums.CouponDiscountTypeEnum;
import com.ailms.entity.enums.CouponStatusEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.entity.enums.SalaryTypeEnum;
import com.ailms.entity.enums.SigningStatusEnum;
import com.ailms.entity.enums.UserCouponStatusEnum;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BadRequestException;
import com.ailms.exception.ForbiddenException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.CourseProgressRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CourseSectionRepository;
import com.ailms.repository.CouponRepository;
import com.ailms.repository.CartItemRepository;
import com.ailms.repository.DepartmentRepository;
import com.ailms.repository.AttendanceRepository;
import com.ailms.repository.ApprovalRequestRepository;
import com.ailms.repository.EmployeeContractRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.EnrollmentPackageRepository;
import com.ailms.repository.LeaveRequestRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.repository.LessonResourceRepository;
import com.ailms.repository.OrderRepository;
import com.ailms.repository.QuizRepository;
import com.ailms.repository.StudentProfileRepository;
import com.ailms.repository.UserCouponRepository;
import com.ailms.repository.UserRepository;
import com.ailms.repository.ContractTemplateRepository;
import com.ailms.request.GenerateEmployeeContractRequest;
import com.ailms.request.QuizQuestionOptionRequest;
import com.ailms.request.QuizQuestionRequest;
import com.ailms.request.QuizRequest;
import com.ailms.response.QuizResponse;
import com.ailms.response.EmployeeContractResponse;
import com.ailms.service.ICourseAuthoringService;
import com.ailms.service.IEmployeeContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/** Cấp context nghiệp vụ read-only cho AI sau khi kiểm tra quyền Admin hoặc HR. */
@Service
@RequiredArgsConstructor
public class ManagementAiContextService {

    private static final int DEFAULT_LIMIT = 10;
    private static final int MAX_LIMIT = 20;

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeContractRepository employeeContractRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final ApprovalRequestRepository approvalRequestRepository;
    private final OrderRepository orderRepository;
    private final CouponRepository couponRepository;
    private final UserCouponRepository userCouponRepository;
    private final CartItemRepository cartItemRepository;
    private final CourseRepository courseRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final LessonRepository lessonRepository;
    private final LessonResourceRepository lessonResourceRepository;
    private final QuizRepository quizRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentPackageRepository enrollmentPackageRepository;
    private final CourseProgressRepository courseProgressRepository;
    private final DepartmentRepository departmentRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final AiNotificationActionService aiNotificationActionService;
    private final ICourseAuthoringService courseAuthoringService;
    private final IEmployeeContractService employeeContractService;
    private final ContractTemplateRepository contractTemplateRepository;

    /** Thực thi đúng một tool allow-list và ghi audit metadata không chứa dữ liệu nhạy cảm. */
    @Transactional
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
            case "get_course_details" -> courseDetails(arguments);
            case "get_course_curriculum" -> courseCurriculum(arguments);
            case "get_my_learning_progress" -> myLearningProgress(arguments, context);
            case "recommend_next_learning_step" -> recommendNextLearningStep(arguments, context);
            case "get_lesson_summary_and_resources" -> lessonSummaryAndResources(arguments);
            case "check_and_prepare_contract_creation" -> withAdminOrHr(context, () -> checkAndPrepareContractCreation(arguments));
            case "create_or_renew_employee_contract" -> withAdminOrHr(context, () -> createOrRenewEmployeeContract(arguments, context));
            case "list_expiring_contracts_advanced" -> withAdminOrHr(context, () -> expiringContractsAdvanced(arguments));
            case "lock_or_unlock_employee_account" -> withAdminOrHr(context, () -> lockOrUnlockEmployeeAccount(arguments, context));
            case "lock_or_unlock_student_account" -> withAdmin(context, () -> lockOrUnlockStudentAccount(arguments, context));
            case "get_employee_leave_and_attendance_detail" -> withAdminOrHr(context, () -> employeeLeaveAndAttendanceDetail(arguments));
            case "get_student_detailed_learning_progress" -> withAdminOrHr(context, () -> studentDetailedLearningProgress(arguments));
            case "list_students_at_learning_risk" -> withAdminOrHr(context, () -> studentsAtLearningRisk(arguments));
            case "draft_coupon_and_distribute" -> withAdmin(context, () -> draftCouponAndDistribute(arguments, context));
            case "get_sales_kpi_and_order_analytics" -> withAdmin(context, () -> salesKpiAndOrderAnalytics(arguments));
            case "query_abandoned_carts_and_retarget" -> withAdmin(context, () -> abandonedCartsAndRetarget(arguments));
            case "create_quiz_for_course_or_lesson" -> withTeacherOrAdmin(context, () -> createQuizForCourseOrLesson(arguments, context));
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

    /** Xác thực người dùng có quyền Admin, HR hoặc Giảng viên trước khi thực thi. */
    private void requireTeacherOrAdmin(AiToolAccessContext context) {
        boolean authorized = context.roles().stream()
                .anyMatch(role -> role.equals("ROLE_ADMIN") || role.equals("ROLE_TEACHER")
                        || role.equals("ROLE_INSTRUCTOR") || role.equals("ROLE_HR"));
        if (!authorized) {
            throw new ForbiddenException("Chỉ Giảng viên hoặc Quản trị viên mới được tạo và lưu bài kiểm tra");
        }
    }

    /** Chạy supplier sau khi xác thực role Teacher hoặc Admin. */
    private Map<String, Object> withTeacherOrAdmin(
            AiToolAccessContext context, java.util.function.Supplier<Map<String, Object>> supplier) {
        requireTeacherOrAdmin(context);
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

    /** Lấy chi tiết thông tin tổng quan, mục tiêu và yêu cầu của khóa học. */
    private Map<String, Object> courseDetails(Map<String, Object> arguments) {
        String courseId = optionalString(arguments, "courseId");
        String keyword = optionalString(arguments, "keyword");
        CourseEntity course = null;
        if (courseId != null) {
            try {
                course = courseRepository.findById(Long.valueOf(courseId)).orElse(null);
            } catch (NumberFormatException ignored) {
            }
        }
        if (course == null && keyword != null) {
            course = courseRepository.findByNameContainingIgnoreCase(keyword).stream().findFirst().orElse(null);
        }
        if (course == null) {
            return Map.of("found", false, "message", "Không tìm thấy thông tin khóa học phù hợp.");
        }
        int totalLessons = lessonRepository.countByCourseSectionEntityCourseEntityId(course.getId());
        int totalDurationMin = lessonRepository.sumDurationByCourseEntityId(course.getId());
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("found", true);
        res.put("courseId", String.valueOf(course.getId()));
        res.put("name", course.getName());
        res.put("code", course.getCode());
        res.put("category", course.getCategoryEntity() != null ? course.getCategoryEntity().getName() : "Chưa phân loại");
        res.put("description", nullSafe(course.getDescription()));
        res.put("learningObjectives", nullSafe(course.getLearningObjectives()));
        res.put("prerequisites", nullSafe(course.getPrerequisites()));
        res.put("level", course.getLevel() != null ? course.getLevel().name() : "ALL_LEVELS");
        res.put("totalLessons", totalLessons);
        res.put("totalDurationMin", totalDurationMin);
        res.put("ratingAvg", course.getAvgRating());
        res.put("ratingCount", course.getReviewCount());
        res.put("status", course.getStatus() != null ? course.getStatus().name() : "ACTIVE");
        return res;
    }

    /** Lấy khung chương trình chi tiết (Sections & Lessons) của khóa học. */
    private Map<String, Object> courseCurriculum(Map<String, Object> arguments) {
        String courseIdStr = optionalString(arguments, "courseId");
        if (courseIdStr == null) {
            throw new BadRequestException("Cần truyền courseId");
        }
        Long courseId;
        try {
            courseId = Long.valueOf(courseIdStr);
        } catch (NumberFormatException e) {
            throw new BadRequestException("courseId không hợp lệ");
        }
        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseIdStr));

        List<CourseSectionEntity> sections = courseSectionRepository.findByCourseEntity_IdOrderByOrderIndexAsc(courseId);
        List<Map<String, Object>> sectionList = new ArrayList<>();
        int totalLessons = 0;

        for (CourseSectionEntity section : sections) {
            List<LessonEntity> lessons = lessonRepository.findByCourseSectionEntity_IdOrderByOrderIndexAsc(section.getId());
            List<Map<String, Object>> lessonList = new ArrayList<>();
            for (LessonEntity lesson : lessons) {
                if (lesson.getStatus() != BaseStatusEnum.ACTIVE) continue;
                totalLessons++;
                Map<String, Object> lMap = new LinkedHashMap<>();
                lMap.put("lessonId", String.valueOf(lesson.getId()));
                lMap.put("name", lesson.getName());
                lMap.put("contentType", lesson.getContentType());
                lMap.put("durationMin", lesson.getDurationMin());
                lMap.put("durationSec", lesson.getDurationSec());
                lMap.put("previewType", lesson.getPreviewType() != null ? lesson.getPreviewType().name() : "LOCKED");
                lMap.put("orderIndex", lesson.getOrderIndex());
                lessonList.add(lMap);
            }
            Map<String, Object> sMap = new LinkedHashMap<>();
            sMap.put("sectionId", String.valueOf(section.getId()));
            sMap.put("name", section.getName());
            sMap.put("orderIndex", section.getOrderIndex());
            sMap.put("lessonCount", lessonList.size());
            sMap.put("lessons", lessonList);
            sectionList.add(sMap);
        }

        return Map.of(
                "courseId", String.valueOf(course.getId()),
                "courseName", course.getName(),
                "totalSections", sections.size(),
                "totalLessons", totalLessons,
                "sections", sectionList
        );
    }

    /** Lấy tiến độ học tập cá nhân của chính học viên hiện tại. */
    private Map<String, Object> myLearningProgress(Map<String, Object> arguments, AiToolAccessContext context) {
        Long userId = context.ownerId();
        String courseIdStr = optionalString(arguments, "courseId");

        if (courseIdStr != null) {
            Long courseId;
            try {
                courseId = Long.valueOf(courseIdStr);
            } catch (NumberFormatException e) {
                throw new BadRequestException("courseId không hợp lệ");
            }
            CourseEntity course = courseRepository.findById(courseId).orElse(null);
            var progressOpt = courseProgressRepository.findByUserIdAndCourseId(userId, courseId);
            if (progressOpt.isPresent()) {
                CourseProgressEntity progress = progressOpt.get();
                Map<String, Object> pMap = progressSummary(progress);
                pMap.put("courseName", course != null ? course.getName() : "Khóa học #" + courseId);
                return pMap;
            }
            return Map.of(
                    "courseId", courseIdStr,
                    "courseName", course != null ? course.getName() : "Khóa học #" + courseId,
                    "progressPercent", 0,
                    "completedLessons", 0,
                    "totalLessons", course != null ? lessonRepository.countByCourseSectionEntityCourseEntityId(courseId) : 0,
                    "note", "Chưa có tiến độ ghi nhận cho khóa học này."
            );
        }

        List<Long> activeCourseIds = enrollmentPackageRepository.findActiveCourseIdsByUser(
                userId, LocalDateTime.now());
        List<CourseProgressEntity> progressList = courseProgressRepository.findByUserId(userId).stream()
                .filter(progress -> activeCourseIds.contains(progress.getCourseId()))
                .toList();
        Map<Long, Map<String, Object>> progressByCourse = new LinkedHashMap<>();
        for (CourseProgressEntity progress : progressList) {
            CourseEntity course = courseRepository.findById(progress.getCourseId()).orElse(null);
            Map<String, Object> item = progressSummary(progress);
            item.put("courseName", course != null ? course.getName() : "Khóa học #" + progress.getCourseId());
            progressByCourse.put(progress.getCourseId(), item);
        }
        for (EnrollmentEntity enrollment : enrollmentRepository.findByUserEntity_Id(userId).stream()
                .filter(enrollment -> activeCourseIds.contains(enrollment.getCourseEntity().getId()))
                .toList()) {
            Long courseId = enrollment.getCourseEntity().getId();
            if (!progressByCourse.containsKey(courseId)) {
                Map<String, Object> enrollmentSummary = new LinkedHashMap<>();
                enrollmentSummary.put("courseId", String.valueOf(courseId));
                enrollmentSummary.put("courseName", enrollment.getCourseEntity().getName());
                enrollmentSummary.put("progressPercent", 0);
                enrollmentSummary.put("completedLessons", 0);
                enrollmentSummary.put("totalLessons",
                        lessonRepository.countByCourseSectionEntityCourseEntityId(courseId));
                if (enrollment.getStatus() != null) {
                    enrollmentSummary.put("status", enrollment.getStatus());
                }
                progressByCourse.put(courseId, enrollmentSummary);
            }
        }
        List<Map<String, Object>> progressSummaries = new ArrayList<>(progressByCourse.values());

        return Map.of(
                "userId", String.valueOf(userId),
                "enrolledCoursesCount", progressSummaries.size(),
                "courses", progressSummaries
        );
    }

    /** Phân tích tiến độ để gợi ý bài học tiếp theo hoặc bài ôn tập cho học viên. */
    private Map<String, Object> recommendNextLearningStep(Map<String, Object> arguments, AiToolAccessContext context) {
        Long userId = context.ownerId();
        String courseIdStr = optionalString(arguments, "courseId");
        if (courseIdStr == null) {
            throw new BadRequestException("Cần truyền courseId");
        }
        Long courseId;
        try {
            courseId = Long.valueOf(courseIdStr);
        } catch (NumberFormatException e) {
            throw new BadRequestException("courseId không hợp lệ");
        }

        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseIdStr));

        var progressOpt = courseProgressRepository.findByUserIdAndCourseId(userId, courseId);
        int progressPercent = progressOpt.map(CourseProgressEntity::getProgressPercent).orElse(0);
        int completedLessons = progressOpt.map(CourseProgressEntity::getCompletedLessons).orElse(0);

        List<LessonEntity> allLessons = lessonRepository
                .findByCourseSectionEntity_CourseEntity_IdOrderByCourseSectionEntity_OrderIndexAscOrderIndexAsc(courseId)
                .stream()
                .filter(l -> l.getStatus() == BaseStatusEnum.ACTIVE)
                .toList();

        LessonEntity nextLesson = null;
        if (completedLessons < allLessons.size()) {
            nextLesson = allLessons.get(completedLessons);
        } else if (!allLessons.isEmpty()) {
            nextLesson = allLessons.get(allLessons.size() - 1);
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("courseId", String.valueOf(course.getId()));
        res.put("courseName", course.getName());
        res.put("currentProgressPercent", progressPercent);
        res.put("completedLessons", completedLessons);
        res.put("totalLessons", allLessons.size());

        if (nextLesson != null) {
            res.put("hasRecommendation", true);
            res.put("nextLessonId", String.valueOf(nextLesson.getId()));
            res.put("nextLessonName", nextLesson.getName());
            res.put("nextLessonContentType", nextLesson.getContentType());
            res.put("nextLessonDurationMin", nextLesson.getDurationMin());
            res.put("sectionName", nextLesson.getCourseSectionEntity() != null ? nextLesson.getCourseSectionEntity().getName() : "");
            res.put("reason", completedLessons >= allLessons.size()
                    ? "Bạn đã hoàn thành tất cả bài học! Hãy ôn tập lại các bài kiểm tra hoặc làm bài tập cuối khóa."
                    : "Đây là bài học tiếp theo theo thứ tự trong chương trình đào tạo.");
        } else {
            res.put("hasRecommendation", false);
            res.put("reason", "Khóa học hiện chưa có bài học nào được kích hoạt.");
        }
        return res;
    }

    /** Lấy tóm tắt nội dung và tài liệu đính kèm của một bài học cụ thể. */
    private Map<String, Object> lessonSummaryAndResources(Map<String, Object> arguments) {
        String lessonIdStr = optionalString(arguments, "lessonId");
        if (lessonIdStr == null) {
            throw new BadRequestException("Cần truyền lessonId");
        }
        Long lessonId;
        try {
            lessonId = Long.valueOf(lessonIdStr);
        } catch (NumberFormatException e) {
            throw new BadRequestException("lessonId không hợp lệ");
        }

        LessonEntity lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> ResourceNotFoundException.of("Lesson", lessonIdStr));

        List<LessonResourceEntity> resources = lessonResourceRepository.findByLessonEntity_Id(lessonId);
        List<Map<String, Object>> resourceList = resources.stream()
                .filter(r -> r.getStatus() == BaseStatusEnum.ACTIVE)
                .map(r -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("resourceId", String.valueOf(r.getId()));
                    item.put("name", r.getName());
                    item.put("fileName", r.getFileMetadata() != null ? nullSafe(r.getFileMetadata().getOriginalName()) : "");
                    item.put("fileType", r.getFileMetadata() != null ? nullSafe(r.getFileMetadata().getContentType()) : "");
                    return item;
                })
                .toList();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("lessonId", String.valueOf(lesson.getId()));
        res.put("name", lesson.getName());
        res.put("contentType", lesson.getContentType());
        res.put("description", nullSafe(lesson.getDescription()));
        res.put("durationMin", lesson.getDurationMin());
        res.put("durationSec", lesson.getDurationSec());
        res.put("sectionName", lesson.getCourseSectionEntity() != null ? lesson.getCourseSectionEntity().getName() : "");
        res.put("courseName", lesson.getCourseSectionEntity() != null && lesson.getCourseSectionEntity().getCourseEntity() != null
                ? lesson.getCourseSectionEntity().getCourseEntity().getName() : "");
        res.put("resourceCount", resourceList.size());
        res.put("resources", resourceList);
        return res;
    }

    /** Kiểm tra trạng thái nhân viên và hợp đồng hiện tại để chuẩn bị tạo hợp đồng mới. */
    private Map<String, Object> checkAndPrepareContractCreation(Map<String, Object> arguments) {
        String keyword = optionalString(arguments, "keyword");
        String employeeIdStr = optionalString(arguments, "employeeId");
        String employeeCode = optionalString(arguments, "employeeCode");

        EmployeeEntity employee = null;
        if (employeeIdStr != null) {
            try {
                employee = employeeRepository.findById(Long.valueOf(employeeIdStr)).orElse(null);
            } catch (NumberFormatException ignored) {}
        }
        if (employee == null && employeeCode != null) {
            employee = employeeRepository.findByEmployeeCode(employeeCode).orElse(null);
        }
        if (employee == null && keyword != null) {
            employee = employeeRepository.findAll().stream()
                    .filter(candidate -> containsEmployee(candidate, keyword))
                    .findFirst()
                    .orElse(null);
        }
        if (employee == null) {
            return Map.of("found", false, "message", "Không tìm thấy thông tin nhân viên.");
        }

        List<EmployeeContractEntity> activeContracts = employeeContractRepository
                .findByEmployee_UserIdAndStatus(employee.getUserId(), BaseStatusEnum.ACTIVE);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("found", true);
        res.put("employeeId", String.valueOf(employee.getUserId()));
        res.put("employeeCode", employee.getEmployeeCode());
        res.put("fullName", employee.getUserEntity() != null ? employee.getUserEntity().getFullName() : "");
        res.put("department", employee.getDepartment() != null ? employee.getDepartment().getName() : "");

        if (!activeContracts.isEmpty()) {
            EmployeeContractEntity active = activeContracts.get(0);
            long daysRemaining = active.getEndDate() != null
                    ? ChronoUnit.DAYS.between(LocalDate.now(), active.getEndDate())
                    : -1;
            res.put("hasActiveContract", true);
            res.put("activeContractId", String.valueOf(active.getId()));
            res.put("activeContractType", active.getContractTypeEnum() != null ? active.getContractTypeEnum().name() : "");
            res.put("activeStartDate", active.getStartDate() != null ? active.getStartDate().toString() : "");
            res.put("activeEndDate", active.getEndDate() != null ? active.getEndDate().toString() : "Vô thời hạn");
            res.put("daysRemaining", daysRemaining);
            res.put("warning", String.format(
                    "Nhân viên này vẫn còn hợp đồng %s còn hiệu lực đến ngày %s (%d ngày nữa). " +
                    "Nếu bạn tạo hợp đồng mới, hợp đồng cũ sẽ tự động được chấm dứt (TERMINATED). " +
                    "Vui lòng xác nhận tạo hợp đồng và cung cấp các thông tin cần thiết: Loại HĐ (PROBATION, FIXED_TERM, INDEFINITE), " +
                    "Mức lương cơ bản, Hình thức lương (MONTHLY/DAILY/HOURLY), Ngày bắt đầu và Ngày kết thúc.",
                    active.getContractTypeEnum() != null ? active.getContractTypeEnum().name() : "hiện tại",
                    active.getEndDate() != null ? active.getEndDate().toString() : "vô thời hạn",
                    daysRemaining
            ));
        } else {
            res.put("hasActiveContract", false);
            res.put("message", "Nhân viên chưa có hợp đồng hiệu lực. Vui lòng cung cấp các thông tin cần thiết: " +
                    "Loại hợp đồng (PROBATION, FIXED_TERM, INDEFINITE), Mức lương cơ bản, Hình thức lương (MONTHLY/DAILY/HOURLY), Ngày bắt đầu, Ngày kết thúc.");
        }
        res.put("requiredSlots", List.of("contractType", "baseSalary", "salaryType", "startDate", "endDate"));
        return res;
    }

    /** Tạo hợp đồng lao động mới cho nhân viên và tự động chấm dứt hợp đồng cũ nếu được yêu cầu. */
    private Map<String, Object> createOrRenewEmployeeContract(Map<String, Object> arguments, AiToolAccessContext context) {
        String employeeIdStr = optionalString(arguments, "employeeId");
        String employeeCode = optionalString(arguments, "employeeCode");
        String keyword = optionalString(arguments, "keyword");

        EmployeeEntity employee = null;
        if (employeeIdStr != null) {
            try {
                employee = employeeRepository.findById(Long.valueOf(employeeIdStr)).orElse(null);
            } catch (NumberFormatException ignored) {}
            if (employee == null) {
                employee = employeeRepository.findByEmployeeCode(employeeIdStr).orElse(null);
            }
        }
        if (employee == null && employeeCode != null) {
            employee = employeeRepository.findByEmployeeCode(employeeCode).orElse(null);
        }
        if (employee == null && keyword != null) {
            employee = employeeRepository.findAll().stream()
                    .filter(candidate -> containsEmployee(candidate, keyword))
                    .findFirst()
                    .orElse(null);
        }
        if (employee == null) {
            throw new ResourceNotFoundException("Không tìm thấy thông tin nhân viên: " + (employeeIdStr != null ? employeeIdStr : (employeeCode != null ? employeeCode : keyword)));
        }

        String contractTypeStr = optionalString(arguments, "contractType");
        String salaryTypeStr = optionalString(arguments, "salaryType");
        String startDateStr = optionalString(arguments, "startDate");
        String endDateStr = optionalString(arguments, "endDate");
        Object baseSalaryObj = arguments.get("baseSalary");
        boolean forceTerminateOldContract = Boolean.parseBoolean(String.valueOf(arguments.getOrDefault("forceTerminateOldContract", "false")));

        if (contractTypeStr == null || startDateStr == null || baseSalaryObj == null) {
            throw new BadRequestException("Vui lòng cung cấp đủ: contractType, baseSalary, startDate");
        }

        ContractTypeEnum contractType;
        try {
            contractType = ContractTypeEnum.valueOf(contractTypeStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("contractType không hợp lệ (PROBATION, FIXED_TERM, INDEFINITE, SEASONAL)");
        }

        SalaryTypeEnum salaryType = SalaryTypeEnum.MONTHLY;
        if (salaryTypeStr != null) {
            try {
                salaryType = SalaryTypeEnum.valueOf(salaryTypeStr.toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        LocalDate startDate;
        try {
            startDate = LocalDate.parse(startDateStr);
        } catch (DateTimeParseException e) {
            throw new BadRequestException("startDate phải theo định dạng yyyy-MM-dd");
        }

        LocalDate endDate = null;
        if (endDateStr != null && !endDateStr.isBlank()) {
            try {
                endDate = LocalDate.parse(endDateStr);
            } catch (DateTimeParseException e) {
                throw new BadRequestException("endDate phải theo định dạng yyyy-MM-dd");
            }
        }

        BigDecimal baseSalary;
        try {
            baseSalary = new BigDecimal(String.valueOf(baseSalaryObj));
        } catch (Exception e) {
            throw new BadRequestException("baseSalary không hợp lệ");
        }

        List<EmployeeContractEntity> activeContracts = employeeContractRepository
                .findByEmployee_UserIdAndStatus(employee.getUserId(), BaseStatusEnum.ACTIVE);

        if (!activeContracts.isEmpty() && !forceTerminateOldContract) {
            return Map.of(
                    "status", "CONFIRMATION_REQUIRED",
                    "hasActiveContract", true,
                    "message", "Nhân viên hiện có hợp đồng đang hoạt động. Bạn có chắc chắn muốn tạo hợp đồng mới không? " +
                            "Nếu đồng ý, hệ thống sẽ tự động chấm dứt hợp đồng cũ. Hãy xác nhận bằng cách gửi lại với forceTerminateOldContract=true."
            );
        }

        for (EmployeeContractEntity oldContract : activeContracts) {
            oldContract.setStatus(BaseStatusEnum.INACTIVE);
            oldContract.setTerminatedAt(LocalDateTime.now());
            oldContract.setTerminationReason("Chấm dứt để gia hạn/thay thế hợp đồng mới tạo bởi AI Copilot");
            employeeContractRepository.save(oldContract);
        }

        Long templateId = contractTemplateRepository
                .findFirstByContractTypeEnumAndStatusOrderByIdDesc(contractType, BaseStatusEnum.ACTIVE)
                .map(template -> template.getId())
                .orElseThrow(() -> new BadRequestException(
                        "Chưa có mẫu hợp đồng ACTIVE phù hợp với loại " + contractType + ". Vui lòng tạo mẫu trước."));

        EmployeeContractResponse generated = employeeContractService.generateContract(
                GenerateEmployeeContractRequest.builder()
                        .employeeId(employee.getUserId())
                        .contractTypeEnum(contractType)
                        .templateId(templateId)
                        .startDate(startDate)
                        .endDate(endDate)
                        .baseSalary(baseSalary)
                        .salaryTypeEnum(salaryType)
                        .build());

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("status", "SUCCESS");
        res.put("contractId", String.valueOf(generated.getId()));
        res.put("employeeCode", employee.getEmployeeCode());
        res.put("fullName", employee.getUserEntity() != null ? employee.getUserEntity().getFullName() : "");
        res.put("contractType", generated.getContractTypeEnum().name());
        res.put("salaryType", generated.getSalaryTypeEnum().name());
        res.put("baseSalary", generated.getBaseSalary());
        res.put("startDate", generated.getStartDate().toString());
        res.put("endDate", generated.getEndDate() != null ? generated.getEndDate().toString() : "Vô thời hạn");
        res.put("signingStatus", generated.getSigningStatus().name());
        res.put("fileKey", generated.getFileKey());
        res.put("fileName", generated.getFileName());
        res.put("downloadUrl", generated.getDownloadUrl());
        res.put("templateId", String.valueOf(templateId));
        res.put("terminatedOldContractsCount", activeContracts.size());
        res.put("message", "Đã tạo hợp đồng mới bằng luồng sinh PDF của hệ thống, lưu tệp PDF vào MinIO và chuyển hợp đồng cũ sang TERMINATED.");
        return res;
    }

    /** Lọc danh sách hợp đồng sắp hết hạn nâng cao theo số ngày và phòng ban. */
    private Map<String, Object> expiringContractsAdvanced(Map<String, Object> arguments) {
        int daysAhead = positiveInt(arguments, "daysAhead", 60, 180);
        String departmentName = optionalString(arguments, "departmentName");
        String contractType = optionalString(arguments, "contractType");

        LocalDate today = LocalDate.now();
        LocalDate targetDate = today.plusDays(daysAhead);

        List<EmployeeContractEntity> contracts = employeeContractRepository
                .findByStatusAndEndDateBetween(BaseStatusEnum.ACTIVE, today, targetDate);

        List<Map<String, Object>> list = contracts.stream()
                .filter(c -> {
                    if (departmentName != null && !departmentName.isBlank()) {
                        if (c.getEmployee() == null || c.getEmployee().getDepartment() == null) return false;
                        return c.getEmployee().getDepartment().getName().toLowerCase().contains(departmentName.toLowerCase());
                    }
                    return true;
                })
                .filter(c -> {
                    if (contractType != null && !contractType.isBlank()) {
                        return c.getContractTypeEnum() != null && c.getContractTypeEnum().name().equalsIgnoreCase(contractType);
                    }
                    return true;
                })
                .map(c -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("contractId", String.valueOf(c.getId()));
                    item.put("employeeCode", c.getEmployee() != null ? c.getEmployee().getEmployeeCode() : "");
                    item.put("employeeName", c.getEmployee() != null && c.getEmployee().getUserEntity() != null ? c.getEmployee().getUserEntity().getFullName() : "");
                    item.put("department", c.getEmployee() != null && c.getEmployee().getDepartment() != null ? c.getEmployee().getDepartment().getName() : "");
                    item.put("contractType", c.getContractTypeEnum() != null ? c.getContractTypeEnum().name() : "");
                    item.put("startDate", c.getStartDate() != null ? c.getStartDate().toString() : "");
                    item.put("endDate", c.getEndDate() != null ? c.getEndDate().toString() : "");
                    item.put("daysRemaining", c.getEndDate() != null ? ChronoUnit.DAYS.between(today, c.getEndDate()) : 0);
                    return item;
                })
                .toList();

        return Map.of(
                "daysAhead", daysAhead,
                "count", list.size(),
                "contracts", list
        );
    }

    /** Khóa hoặc mở khóa tài khoản nhân viên kèm lý do. */
    private Map<String, Object> lockOrUnlockEmployeeAccount(Map<String, Object> arguments, AiToolAccessContext context) {
        String employeeIdStr = optionalString(arguments, "employeeId");
        String employeeCode = optionalString(arguments, "employeeCode");
        String action = optionalString(arguments, "action");
        String reason = optionalString(arguments, "reason");

        if (action == null || (!action.equalsIgnoreCase("LOCK") && !action.equalsIgnoreCase("UNLOCK"))) {
            throw new BadRequestException("action phải là LOCK hoặc UNLOCK");
        }

        EmployeeEntity employee = null;
        if (employeeIdStr != null) {
            try {
                employee = employeeRepository.findById(Long.valueOf(employeeIdStr)).orElse(null);
            } catch (NumberFormatException ignored) {}
        }
        if (employee == null && employeeCode != null) {
            employee = employeeRepository.findByEmployeeCode(employeeCode).orElse(null);
        }
        if (employee == null) {
            throw new ResourceNotFoundException("Không tìm thấy nhân viên.");
        }

        UserEntity user = employee.getUserEntity();
        if (user == null) {
            throw new BadRequestException("Nhân viên không có tài khoản người dùng liên kết.");
        }

        boolean isLock = action.equalsIgnoreCase("LOCK");
        if (isLock && (reason == null || reason.isBlank())) {
            throw new BadRequestException("Cần cung cấp lý do khi khóa tài khoản.");
        }

        user.setStatus(isLock ? UserStatusEnum.LOCKED : UserStatusEnum.ACTIVE);
        userRepository.save(user);

        return Map.of(
                "success", true,
                "employeeCode", employee.getEmployeeCode(),
                "fullName", user.getFullName(),
                "newStatus", user.getStatus().name(),
                "action", action.toUpperCase(),
                "reason", nullSafe(reason),
                "message", isLock ? "Đã khóa tài khoản nhân viên thành công." : "Đã mở khóa tài khoản nhân viên thành công."
        );
    }

    /** Khóa hoặc mở khóa tài khoản học viên kèm lý do. */
    private Map<String, Object> lockOrUnlockStudentAccount(Map<String, Object> arguments, AiToolAccessContext context) {
        String studentIdStr = optionalString(arguments, "studentId");
        String studentCode = optionalString(arguments, "studentCode");
        String action = optionalString(arguments, "action");
        String reason = optionalString(arguments, "reason");

        if (action == null || (!action.equalsIgnoreCase("LOCK") && !action.equalsIgnoreCase("UNLOCK"))) {
            throw new BadRequestException("action phải là LOCK hoặc UNLOCK");
        }

        StudentProfileEntity student = null;
        if (studentIdStr != null) {
            try {
                student = studentProfileRepository.findById(Long.valueOf(studentIdStr)).orElse(null);
            } catch (NumberFormatException ignored) {}
        }
        if (student == null && studentCode != null) {
            student = studentProfileRepository.findByStudentCode(studentCode).orElse(null);
        }
        if (student == null) {
            throw new ResourceNotFoundException("Không tìm thấy học viên.");
        }

        UserEntity user = student.getUserEntity();
        if (user == null) {
            throw new BadRequestException("Học viên không có tài khoản người dùng liên kết.");
        }

        boolean isLock = action.equalsIgnoreCase("LOCK");
        if (isLock && (reason == null || reason.isBlank())) {
            throw new BadRequestException("Cần cung cấp lý do khi khóa tài khoản.");
        }

        user.setStatus(isLock ? UserStatusEnum.LOCKED : UserStatusEnum.ACTIVE);
        userRepository.save(user);

        return Map.of(
                "success", true,
                "studentCode", student.getStudentCode(),
                "fullName", user.getFullName(),
                "newStatus", user.getStatus().name(),
                "action", action.toUpperCase(),
                "reason", nullSafe(reason),
                "message", isLock ? "Đã khóa tài khoản học viên thành công." : "Đã mở khóa tài khoản học viên thành công."
        );
    }

    /** Thống kê chi tiết chấm công và nghỉ phép của nhân viên theo tháng. */
    private Map<String, Object> employeeLeaveAndAttendanceDetail(Map<String, Object> arguments) {
        String employeeIdStr = optionalString(arguments, "employeeId");
        String employeeCode = optionalString(arguments, "employeeCode");
        String monthStr = optionalString(arguments, "month");

        EmployeeEntity employee = null;
        if (employeeIdStr != null) {
            try {
                employee = employeeRepository.findById(Long.valueOf(employeeIdStr)).orElse(null);
            } catch (NumberFormatException ignored) {}
        }
        if (employee == null && employeeCode != null) {
            employee = employeeRepository.findByEmployeeCode(employeeCode).orElse(null);
        }
        if (employee == null) {
            throw new ResourceNotFoundException("Không tìm thấy nhân viên.");
        }

        LocalDate startDate = monthStr != null ? LocalDate.parse(monthStr + "-01") : LocalDate.now().withDayOfMonth(1);
        LocalDate endDate = startDate.plusMonths(1).minusDays(1);

        Long resolvedEmployeeId = employee.getUserId();
        long attendanceCount = attendanceRepository.findByWorkDateBetween(startDate, endDate).stream()
                .filter(attendance -> attendance.getEmployee() != null
                        && attendance.getEmployee().getUserId().equals(resolvedEmployeeId))
                .count();
        long pendingLeaveCount = leaveRequestRepository.findByEmployee_UserId(resolvedEmployeeId).stream()
                .filter(leave -> leave.getStatus() != null && leave.getStatus().name().equals("PENDING"))
                .count();

        return Map.of(
                "employeeCode", employee.getEmployeeCode(),
                "fullName", employee.getUserEntity() != null ? employee.getUserEntity().getFullName() : "",
                "department", employee.getDepartment() != null ? employee.getDepartment().getName() : "",
                "month", startDate.getYear() + "-" + String.format("%02d", startDate.getMonthValue()),
                "totalAttendanceRecords", attendanceCount,
                "pendingLeaveRequests", pendingLeaveCount
        );
    }

    /** Tra cứu chi tiết tiến độ học tập, bài đang học dở và kết quả kiểm tra của học viên. */
    private Map<String, Object> studentDetailedLearningProgress(Map<String, Object> arguments) {
        String studentIdStr = optionalString(arguments, "studentId");
        String studentCode = optionalString(arguments, "studentCode");
        String keyword = optionalString(arguments, "keyword");
        String courseIdStr = optionalString(arguments, "courseId");

        StudentProfileEntity student = null;
        if (studentIdStr != null) {
            try {
                student = studentProfileRepository.findById(Long.valueOf(studentIdStr)).orElse(null);
            } catch (NumberFormatException ignored) {}
        }
        if (student == null && studentCode != null) {
            student = studentProfileRepository.findByStudentCode(studentCode).orElse(null);
        }
        if (student == null && keyword != null) {
            student = studentProfileRepository.findAll().stream()
                    .filter(candidate -> containsStudent(candidate, keyword))
                    .findFirst()
                    .orElse(null);
        }
        if (student == null) {
            return Map.of("found", false, "message", "Không tìm thấy học viên.");
        }

        Long userId = student.getUserId();
        List<CourseProgressEntity> progresses = courseProgressRepository.findByUserId(userId);
        if (courseIdStr != null) {
            try {
                Long cId = Long.valueOf(courseIdStr);
                progresses = progresses.stream().filter(p -> p.getCourseId().equals(cId)).toList();
            } catch (NumberFormatException ignored) {}
        }

        List<Map<String, Object>> courseList = new ArrayList<>();
        for (CourseProgressEntity p : progresses) {
            CourseEntity course = courseRepository.findById(p.getCourseId()).orElse(null);
            List<LessonEntity> allLessons = lessonRepository
                    .findByCourseSectionEntity_CourseEntity_IdOrderByCourseSectionEntity_OrderIndexAscOrderIndexAsc(p.getCourseId());
            int completedCount = p.getCompletedLessons() != null ? p.getCompletedLessons() : 0;
            LessonEntity currentLesson = null;
            if (completedCount < allLessons.size()) {
                currentLesson = allLessons.get(completedCount);
            } else if (!allLessons.isEmpty()) {
                currentLesson = allLessons.get(allLessons.size() - 1);
            }

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("courseId", String.valueOf(p.getCourseId()));
            item.put("courseName", course != null ? course.getName() : "Khóa học #" + p.getCourseId());
            item.put("progressPercent", p.getProgressPercent() != null ? p.getProgressPercent() : 0);
            item.put("completedLessons", completedCount);
            item.put("totalLessons", allLessons.size());
            if (currentLesson != null) {
                item.put("currentLessonName", currentLesson.getName());
                item.put("currentLessonType", currentLesson.getContentType());
                item.put("currentSectionName", currentLesson.getCourseSectionEntity() != null ? currentLesson.getCourseSectionEntity().getName() : "");
            }
            item.put("lastAccessedAt", p.getUpdatedAt() != null ? p.getUpdatedAt().toString() : "");
            courseList.add(item);
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("found", true);
        res.put("studentCode", student.getStudentCode());
        res.put("fullName", student.getUserEntity() != null ? student.getUserEntity().getFullName() : "");
        res.put("email", student.getUserEntity() != null ? student.getUserEntity().getEmail() : "");
        res.put("enrolledCoursesCount", courseList.size());
        res.put("courses", courseList);
        return res;
    }

    /** Lọc danh sách học viên có nguy cơ chậm tiến độ (dưới ngưỡng %). */
    private Map<String, Object> studentsAtLearningRisk(Map<String, Object> arguments) {
        int threshold = positiveInt(arguments, "riskBelowPercent", 50, 100);
        String courseIdStr = optionalString(arguments, "courseId");

        List<CourseProgressEntity> allProgresses = courseProgressRepository.findAll();
        List<Map<String, Object>> riskList = allProgresses.stream()
                .filter(p -> p.getProgressPercent() != null && p.getProgressPercent() < threshold)
                .filter(p -> {
                    if (courseIdStr != null) {
                        try {
                            return p.getCourseId().equals(Long.valueOf(courseIdStr));
                        } catch (NumberFormatException e) {
                            return false;
                        }
                    }
                    return true;
                })
                .limit(20)
                .map(p -> {
                    UserEntity user = userRepository.findById(p.getUserId()).orElse(null);
                    CourseEntity course = courseRepository.findById(p.getCourseId()).orElse(null);
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("userId", String.valueOf(p.getUserId()));
                    item.put("fullName", user != null ? user.getFullName() : "");
                    item.put("courseId", String.valueOf(p.getCourseId()));
                    item.put("courseName", course != null ? course.getName() : "");
                    item.put("progressPercent", p.getProgressPercent());
                    item.put("completedLessons", p.getCompletedLessons());
                    return item;
                })
                .toList();

        return Map.of(
                "riskThresholdPercent", threshold,
                "atRiskCount", riskList.size(),
                "students", riskList
        );
    }

    /** Tạo mã giảm giá và tự động phân phối vào ví voucher của học viên mục tiêu. */
    private Map<String, Object> draftCouponAndDistribute(Map<String, Object> arguments, AiToolAccessContext context) {
        String code = optionalString(arguments, "couponCode");
        if (code == null || code.isBlank()) {
            code = "AI" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        }
        String discountTypeStr = optionalString(arguments, "discountType");
        CouponDiscountTypeEnum discountType = CouponDiscountTypeEnum.PERCENT;
        if (discountTypeStr != null && discountTypeStr.equalsIgnoreCase("FIXED_AMOUNT")) {
            discountType = CouponDiscountTypeEnum.FIXED;
        }

        Object discountValObj = arguments.get("discountValue");
        BigDecimal discountValue = discountValObj != null ? new BigDecimal(String.valueOf(discountValObj)) : BigDecimal.valueOf(10);
        int maxUsage = positiveInt(arguments, "maxUsage", 100, 10000);
        int validDays = positiveInt(arguments, "validDays", 30, 365);

        LocalDateTime now = LocalDateTime.now();
        CouponEntity coupon = CouponEntity.builder()
                .code(code)
                .discountType(discountType)
                .discountValue(discountValue)
                .validFrom(now)
                .validTo(now.plusDays(validDays))
                .status(CouponStatusEnum.ACTIVE)
                .maxUsage(maxUsage)
                .usedCount(0)
                .build();

        CouponEntity savedCoupon = couponRepository.save(coupon);

        List<UserEntity> targetUsers = userRepository.findAll().stream()
                .filter(u -> u.getStatus() == UserStatusEnum.ACTIVE)
                .limit(20)
                .toList();

        int distributedCount = 0;
        for (UserEntity user : targetUsers) {
            if (!userCouponRepository.existsByUserEntity_IdAndCouponEntity_Id(user.getId(), savedCoupon.getId())) {
                UserCouponEntity userCoupon = UserCouponEntity.builder()
                        .userEntity(user)
                        .couponEntity(savedCoupon)
                        .status(UserCouponStatusEnum.AVAILABLE)
                        .build();
                userCouponRepository.save(userCoupon);
                distributedCount++;
            }
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("status", "SUCCESS");
        res.put("couponId", String.valueOf(savedCoupon.getId()));
        res.put("couponCode", savedCoupon.getCode());
        res.put("discountType", savedCoupon.getDiscountType().name());
        res.put("discountValue", savedCoupon.getDiscountValue());
        res.put("validFrom", savedCoupon.getValidFrom().toString());
        res.put("validTo", savedCoupon.getValidTo().toString());
        res.put("distributedStudentsCount", distributedCount);
        res.put("message", String.format("Đã tạo mã giảm giá %s và phân phối vào ví của %d học viên.", savedCoupon.getCode(), distributedCount));
        return res;
    }

    /** Thống kê số liệu doanh thu và đơn hàng bán hàng theo khoảng thời gian. */
    private Map<String, Object> salesKpiAndOrderAnalytics(Map<String, Object> arguments) {
        long totalOrders = orderRepository.count();
        return Map.of(
                "totalOrders", totalOrders,
                "note", "Dữ liệu tổng hợp từ hệ thống bán hàng và đơn hàng."
        );
    }

    /** Tra cứu các giỏ hàng chưa thanh toán để chuẩn bị voucher kích cầu. */
    private Map<String, Object> abandonedCartsAndRetarget(Map<String, Object> arguments) {
        long cartCount = cartItemRepository.count();
        return Map.of(
                "totalCartItems", cartCount,
                "potentialCustomersCount", cartCount,
                "message", String.format("Hiện có %d mục trong giỏ hàng sẵn sàng cho chương trình voucher tiếp thị lại.", cartCount)
        );
    }

    /** Đọc giá trị Long an toàn từ argument map. */
    private Long optionalLong(Map<String, Object> arguments, String key) {
        String val = optionalString(arguments, key);
        if (val == null || val.isBlank()) return null;
        try {
            return Long.valueOf(val.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Tạo bài kiểm tra Quiz trực tiếp vào CSDL hệ thống qua AI Tool Calling. */
    private Map<String, Object> createQuizForCourseOrLesson(Map<String, Object> arguments, AiToolAccessContext context) {
        String title = optionalString(arguments, "title");
        if (title == null || title.isBlank()) {
            throw new BadRequestException("Tiêu đề bài kiểm tra không được để trống");
        }
        String description = optionalString(arguments, "description");
        int timeLimitMin = positiveInt(arguments, "timeLimitMin", 15, 300);
        if (!arguments.containsKey("timeLimitMin") && arguments.containsKey("duration")) {
            timeLimitMin = positiveInt(arguments, "duration", 15, 300);
        }
        Object passScoreObj = arguments.get("passScore");
        if (passScoreObj == null) passScoreObj = arguments.get("passing_score");
        BigDecimal passScore = passScoreObj != null ? new BigDecimal(String.valueOf(passScoreObj)) : BigDecimal.valueOf(80.00);

        Long courseId = optionalLong(arguments, "courseId");
        if (courseId == null) courseId = optionalLong(arguments, "course_id");
        Long sectionId = optionalLong(arguments, "sectionId");
        if (sectionId == null) sectionId = optionalLong(arguments, "section_id");
        Long lessonId = optionalLong(arguments, "lessonId");
        if (lessonId == null) lessonId = optionalLong(arguments, "lesson_id");

        Object questionsObj = arguments.get("questions");
        if (!(questionsObj instanceof List<?> questionsList) || questionsList.isEmpty()) {
            throw new BadRequestException("Danh sách câu hỏi không được để trống");
        }

        List<QuizQuestionRequest> questionRequests = new ArrayList<>();
        for (Object qItem : questionsList) {
            if (qItem instanceof Map<?, ?> qMap) {
                String content = String.valueOf(qMap.get("content"));
                String qType = qMap.get("questionType") != null ? String.valueOf(qMap.get("questionType")) : "SINGLE_CHOICE";
                String explanation = qMap.get("explanation") != null ? String.valueOf(qMap.get("explanation")) : null;
                Object pointsObj = qMap.get("points");
                BigDecimal points = pointsObj != null ? new BigDecimal(String.valueOf(pointsObj)) : BigDecimal.ONE;

                List<QuizQuestionOptionRequest> optionRequests = new ArrayList<>();
                Object optionsObj = qMap.get("options");
                if (optionsObj instanceof List<?> optList) {
                    for (Object optItem : optList) {
                        if (optItem instanceof Map<?, ?> optMap) {
                            String optContent = String.valueOf(optMap.get("content"));
                            boolean isCorrect = Boolean.TRUE.equals(optMap.get("isCorrect"))
                                    || "true".equalsIgnoreCase(String.valueOf(optMap.get("isCorrect")));
                            optionRequests.add(QuizQuestionOptionRequest.builder()
                                    .content(optContent)
                                    .isCorrect(isCorrect)
                                    .build());
                        }
                    }
                }

                if (optionRequests.isEmpty()) {
                    throw new BadRequestException("Mỗi câu hỏi phải có ít nhất 2 phương án trả lời");
                }

                questionRequests.add(QuizQuestionRequest.builder()
                        .content(content)
                        .questionType(qType)
                        .points(points)
                        .explanation(explanation)
                        .options(optionRequests)
                        .build());
            }
        }

        QuizRequest quizRequest = QuizRequest.builder()
                .courseId(courseId)
                .sectionId(sectionId)
                .lessonId(lessonId)
                .title(title)
                .description(description)
                .timeLimitMin(timeLimitMin)
                .passScore(passScore)
                .maxAttempts(3)
                .shuffleQuestions(true)
                .status(BaseStatusEnum.ACTIVE)
                .questions(questionRequests)
                .build();

        QuizResponse createdQuiz = courseAuthoringService.createQuiz(quizRequest);
        if (createdQuiz != null && createdQuiz.getId() != null) {
            quizRepository.findById(createdQuiz.getId()).ifPresent(q -> {
                q.setCreatedBy(context.ownerId());
                quizRepository.save(q);
            });
        }

        String courseName = "thư viện quiz cá nhân";
        if (courseId != null) {
            courseName = courseRepository.findById(courseId).map(CourseEntity::getName).orElse(courseName);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "SUCCESS");
        response.put("quizId", String.valueOf(createdQuiz.getId()));
        response.put("quizCode", createdQuiz.getCode());
        response.put("title", createdQuiz.getTitle());
        response.put("courseId", courseId != null ? String.valueOf(courseId) : null);
        response.put("courseName", courseName);
        response.put("questionCount", questionRequests.size());
        response.put("timeLimitMin", timeLimitMin);
        response.put("passScore", passScore);
        response.put("actionUrl", "/teacher/assessments?tab=quizzes");
        response.put("message", String.format("Đã lưu thành công bài kiểm tra '%s' gồm %d câu hỏi vào %s (Mã bài kiểm tra: %s). Bạn có thể xem và làm thử tại [👉 Quản Lý Bài Kiểm Tra](/teacher/assessments?tab=quizzes).",
                createdQuiz.getTitle(), questionRequests.size(), courseName, createdQuiz.getCode()));
        return response;
    }

    /** Đổi null thành chuỗi rỗng khi xây searchable text. */
    private String nullSafe(String value) {
        return Objects.toString(value, "");
    }
}
