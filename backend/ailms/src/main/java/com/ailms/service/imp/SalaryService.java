package com.ailms.service.imp;

import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.SalaryMapper;
import com.ailms.repository.*;
import com.ailms.repository.specification.SalarySpecification;
import com.ailms.request.CreateSalaryRequest;
import com.ailms.request.GenerateSalaryPeriodRequest;
import com.ailms.request.SalarySearchRequest;
import com.ailms.request.UpdateSalaryRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.SalaryResponse;
import com.ailms.response.SalarySummaryResponse;
import com.ailms.response.PayrollBatchResponse;
import com.ailms.response.SalaryTrendPoint;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IApprovalRequestService;
import com.ailms.service.IEmailService;
import com.ailms.service.INotificationService;
import com.ailms.service.ISalaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SalaryService implements ISalaryService {

    private final SalaryRepository salaryRepository;
    private final EmployeeRepository employeeRepository;
    private final SalaryMapper salaryMapper;
    private final EmployeeContractRepository employeeContractRepository;
    private final IApprovalRequestService approvalRequestService;
    private final INotificationService notificationService;
    private final IEmailService emailService;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final AttendanceRepository attendanceRepository;
    private final TeachingSessionPaymentRepository teachingSessionPaymentRepository;

    private static final String RESOURCE_NAME = "Salary";
    private final ApplicationEventPublisher applicationEventPublisher;

    @Override
    public List<SalaryResponse> getAll() {
        log.info("Getting all salary records");
        return salaryMapper.toResponseList(restrictPayrollCreatorScope(salaryRepository.findAll()));
    }

    @Override
    public SalaryResponse getById(Long id) {
        log.info("Getting salary record by id: {}", id);
        SalaryEntity entity = salaryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        verifySalaryAccess(entity);
        return salaryMapper.toResponse(entity);
    }

    @Override
    public List<SalaryResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting salary records for employee: {}", employeeId);
        verifyEmployeeAccess(employeeId);
        return salaryMapper.toResponseList(salaryRepository.findByEmployee_UserId(employeeId));
    }

    @Transactional
    @Override
    public SalaryResponse create(CreateSalaryRequest request) {
        log.info("Creating salary record for employee: {} and period: {}", request.getEmployeeId(), request.getPeriod());

        if (salaryRepository.existsByEmployee_UserIdAndPeriod(request.getEmployeeId(), request.getPeriod())) {
            throw new DuplicateResourceException("Salary record already exists for employee ID: " + request.getEmployeeId() + " and period: " + request.getPeriod());
        }

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        if (employee.getUserEntity().getStatus() == UserStatusEnum.DELETED) {
            throw new BusinessException("Employee is deleted. Cannot create salary record.");
        }

        List<EmployeeContractEntity> activeContracts = employeeContractRepository.findByEmployee_UserId(request.getEmployeeId()).stream()
                .filter(c -> c.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(c -> !c.getStartDate().isAfter(request.getPeriod().atEndOfMonth()))
                .filter(c -> c.getEndDate() == null || !c.getEndDate().isBefore(request.getPeriod().atDay(1)))
                .toList();

        if (activeContracts.isEmpty()) {
            throw new BusinessException("Nhân viên chưa có hợp đồng hiệu lực cho kỳ lương này");
        }

        EmployeeContractEntity contract = activeContracts.stream()
                .max(Comparator.comparing(EmployeeContractEntity::getStartDate))
                .get();

        SalaryEntity entity = salaryMapper.toEntity(request);
        entity.setEmployee(employee);
        entity.setSalaryTypeEnum(contract.getSalaryTypeEnum());
        entity.setStatus(SalaryStatusEnum.DRAFT);

        calculateSalaryForEmployee(entity,
                employee,
                contract,
                request.getPeriod(),
                request.getMealAllowance(),
                request.getPhoneAllowance(),
                request.getUniformAllowance(),
                request.getResponsibilityAllowance(),
                request.getPerformanceAllowance(),
                request.getInsuranceSalary(),
                request.getDependents(),
                request.getBonus(),
                request.getDeduction()
        );

        SalaryEntity saved = salaryRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "SALARY", entity.getId(), null, entity));
        return salaryMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public SalaryResponse update(Long id, UpdateSalaryRequest request) {
        log.info("Updating salary record: {}", id);

        if (approvalRequestService.isLocked("SALARY", id)) {
            throw new BusinessException("Bảng lương đang trong quá trình phê duyệt, không thể chỉnh sửa.");
        }

        SalaryEntity existing = salaryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        verifySalaryAccess(existing);

        String oldValue = SimpleJsonWriter.toJson(existing);
        if (existing.getStatus() != SalaryStatusEnum.DRAFT
                && existing.getStatus() != SalaryStatusEnum.PENDING
                && existing.getStatus() != SalaryStatusEnum.REJECTED) {
            throw new BusinessException("Approved or paid salaries cannot be updated.");
        }

        if (request.getPeriod() != null && !request.getPeriod().equals(existing.getPeriod())) {
            throw new BusinessException("Cannot change period of salary record.");
        }

        List<EmployeeContractEntity> activeContracts = employeeContractRepository.findByEmployee_UserId(existing.getEmployee().getUserId()).stream()
                .filter(c -> c.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(c -> !c.getStartDate().isAfter(existing.getPeriod().atEndOfMonth()))
                .filter(c -> c.getEndDate() == null || !c.getEndDate().isBefore(existing.getPeriod().atDay(1)))
                .toList();

        if (activeContracts.isEmpty()) {
            throw new BusinessException("Nhân viên chưa có hợp đồng hiệu lực cho kỳ lương này");
        }

        EmployeeContractEntity contract = activeContracts.stream()
                .max(Comparator.comparing(EmployeeContractEntity::getStartDate))
                .get();

        BigDecimal meal = request.getMealAllowance() != null ? request.getMealAllowance() : getDetailAmount(existing, "MEAL_ALLOWANCE");
        BigDecimal phone = request.getPhoneAllowance() != null ? request.getPhoneAllowance() : getDetailAmount(existing, "PHONE_ALLOWANCE");
        BigDecimal uniform = request.getUniformAllowance() != null ? request.getUniformAllowance() : getDetailAmount(existing, "UNIFORM_ALLOWANCE");
        BigDecimal responsibility = request.getResponsibilityAllowance() != null ? request.getResponsibilityAllowance() : getDetailAmount(existing, "RESPONSIBILITY_ALLOWANCE");
        BigDecimal performance = request.getPerformanceAllowance() != null ? request.getPerformanceAllowance() : getDetailAmount(existing, "PERFORMANCE_ALLOWANCE");
        BigDecimal bonus = request.getBonus() != null ? request.getBonus() : getDetailAmount(existing, "BONUS");
        Integer dependents = request.getDependents() != null ? request.getDependents() : getDependentsCount(existing);
        BigDecimal otherDeduction = request.getDeduction() != null ? request.getDeduction() : getDetailAmount(existing, "OTHER_DEDUCTION");
        BigDecimal insSalary = request.getInsuranceSalary() != null ? request.getInsuranceSalary() : getDetailAmount(existing, "INSURANCE_SALARY");

        salaryMapper.updateFromRequest(request, existing);

        existing.setBaseSalary(contract.getBaseSalary());
        existing.setSalaryTypeEnum(contract.getSalaryTypeEnum());

        calculateSalaryForEmployee(existing,
                existing.getEmployee(),
                contract,
                existing.getPeriod(),
                meal,
                phone,
                uniform,
                responsibility,
                performance,
                insSalary,
                dependents,
                bonus,
                otherDeduction
        );

        SalaryEntity updated = salaryRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "SALARY", id, oldValue, existing));
        return salaryMapper.toResponse(updated);
    }

    private BigDecimal getDetailAmount(SalaryEntity entity, String key) {
        if (entity.getDetails() == null) return BigDecimal.ZERO;
        return entity.getDetails().stream()
                .filter(d -> key.equals(d.getItemKey()))
                .map(SalaryDetailEntity::getAmount)
                .findFirst()
                .orElse(BigDecimal.ZERO);
    }

    private Integer getDependentsCount(SalaryEntity entity) {
        if (entity.getDetails() == null) return 0;
        BigDecimal amt = entity.getDetails().stream()
                .filter(d -> "DEPENDENT_DEDUCTION".equals(d.getItemKey()))
                .map(SalaryDetailEntity::getAmount)
                .findFirst()
                .orElse(BigDecimal.ZERO);
        if (amt.compareTo(BigDecimal.ZERO) == 0) return 0;
        return amt.divide(new BigDecimal("4400000"), 0, RoundingMode.HALF_UP).intValue();
    }

    private void calculateSalaryForEmployee(SalaryEntity entity,
                                           EmployeeEntity employee,
                                           EmployeeContractEntity contract,
                                           YearMonth period,
                                           BigDecimal meal,
                                           BigDecimal phone,
                                           BigDecimal uniform,
                                           BigDecimal responsibility,
                                           BigDecimal performance,
                                           BigDecimal insSalary,
                                           Integer dependents,
                                           BigDecimal bonus,
                                           BigDecimal otherDeduction) {
        boolean isFullTime = employee.getEmploymentTypeEnum() == EmploymentTypeEnum.FULL_TIME;
        
        BigDecimal baseSalary = contract.getBaseSalary();
        if (baseSalary == null || baseSalary.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Hợp đồng của nhân viên " + employee.getEmployeeCode() + " chưa có mức lương hợp lệ");
        }
        BigDecimal absentDeduct = BigDecimal.ZERO;
        BigDecimal halfDayDeduct = BigDecimal.ZERO;
        BigDecimal lateDeduct = BigDecimal.ZERO;
        BigDecimal teachingCompensation = BigDecimal.ZERO;

        LocalDate start = period.atDay(1);
        LocalDate end = period.atEndOfMonth();
        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = end.atTime(23, 59, 59);

        if (isFullTime) {
            List<AttendanceEntity> attendances = attendanceRepository.findByEmployeeAndDateRange(employee.getUserId(), start, end);
            int absentCount = 0;
            int halfDayCount = 0;
            int lateCount = 0;
            for (AttendanceEntity att : attendances) {
                if (att.getStatus() == AttendanceStatusEnum.INVALID) {
                    throw new BusinessException("Dữ liệu chấm công không hợp lệ của nhân viên "
                            + employee.getEmployeeCode() + " ngày " + att.getWorkDate());
                }
                if (att.getStatus() == AttendanceStatusEnum.ABSENT) {
                    absentCount++;
                } else if (att.getStatus() == AttendanceStatusEnum.HALF_DAY
                        || att.getStatus() == AttendanceStatusEnum.HALF_DAY_LATE) {
                    halfDayCount++;
                }
                if (att.getStatus() == AttendanceStatusEnum.LATE
                        || att.getStatus() == AttendanceStatusEnum.PRESENT_LATE
                        || att.getStatus() == AttendanceStatusEnum.HALF_DAY_LATE) {
                    lateCount++;
                }
            }
            BigDecimal dailyWage = contract.getBaseSalary().divide(new BigDecimal("22"), 2, RoundingMode.HALF_UP);
            absentDeduct = dailyWage.multiply(BigDecimal.valueOf(absentCount));
            halfDayDeduct = dailyWage.multiply(new BigDecimal("0.5")).multiply(BigDecimal.valueOf(halfDayCount));
            // 5.3: Trừ phạt đi muộn 100k/lần
            lateDeduct = new BigDecimal("100000").multiply(BigDecimal.valueOf(lateCount));

            // Giáo viên full-time nhận thêm thù lao các buổi dạy đã được xác nhận trong kỳ.
            if (userRoleRepository.hasActiveTeacherRole(employee.getUserId(), LocalDateTime.now())) {
                teachingCompensation = getConfirmedTeachingCompensation(employee.getUserId(), startDateTime, endDateTime);
            }
        } else {
            // PART_TIME: baseSalary = SUM(teaching_session_payment.amount) for CONFIRMED payments
            baseSalary = getConfirmedTeachingCompensation(employee.getUserId(), startDateTime, endDateTime);
            
            meal = BigDecimal.ZERO;
            phone = BigDecimal.ZERO;
            uniform = BigDecimal.ZERO;
            responsibility = BigDecimal.ZERO;
            performance = BigDecimal.ZERO;
        }

        calculateAndPopulateSalary(entity,
                baseSalary,
                meal,
                phone,
                uniform,
                responsibility,
                performance,
                insSalary,
                dependents,
                bonus,
                otherDeduction,
                isFullTime,
                absentDeduct,
                halfDayDeduct,
                lateDeduct,
                teachingCompensation
        );
    }

    private BigDecimal getConfirmedTeachingCompensation(Long employeeId,
                                                         LocalDateTime start,
                                                         LocalDateTime end) {
        return teachingSessionPaymentRepository.findByEmployeeAndStatusAndPeriod(
                        employeeId, SessionPaymentStatusEnum.CONFIRMED, start, end).stream()
                .filter(payment -> payment.getAmount() != null)
                .map(TeachingSessionPaymentEntity::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void calculateAndPopulateSalary(SalaryEntity entity,
                                            BigDecimal baseSalary,
                                            BigDecimal meal,
                                            BigDecimal phone,
                                            BigDecimal uniform,
                                            BigDecimal responsibility,
                                            BigDecimal performance,
                                            BigDecimal insSalary,
                                            Integer dependents,
                                            BigDecimal bonus,
                                            BigDecimal otherDeduction,
                                            boolean isFullTime,
                                            BigDecimal absentDeduct,
                                            BigDecimal halfDayDeduct,
                                            BigDecimal lateDeduct,
                                            BigDecimal teachingCompensation) {
        meal = meal != null ? meal : BigDecimal.ZERO;
        phone = phone != null ? phone : BigDecimal.ZERO;
        uniform = uniform != null ? uniform : BigDecimal.ZERO;
        responsibility = responsibility != null ? responsibility : BigDecimal.ZERO;
        performance = performance != null ? performance : BigDecimal.ZERO;
        bonus = bonus != null ? bonus : BigDecimal.ZERO;
        otherDeduction = otherDeduction != null ? otherDeduction : BigDecimal.ZERO;
        teachingCompensation = teachingCompensation != null ? teachingCompensation : BigDecimal.ZERO;
        int depCount = dependents != null ? dependents : 0;

        BigDecimal totalAttendanceDeduction = absentDeduct.add(halfDayDeduct).add(lateDeduct);

        // 1. Gross Salary
        BigDecimal gross = baseSalary.add(teachingCompensation).add(meal).add(phone).add(uniform).add(responsibility).add(performance).add(bonus)
                .subtract(totalAttendanceDeduction);
        if (gross.compareTo(BigDecimal.ZERO) < 0) {
            gross = BigDecimal.ZERO;
        }

        // 2. Insurance Base & Deductions
        BigDecimal bhxh = BigDecimal.ZERO;
        BigDecimal bhyt = BigDecimal.ZERO;
        BigDecimal bhtn = BigDecimal.ZERO;
        BigDecimal totalIns = BigDecimal.ZERO;
        BigDecimal insBase = BigDecimal.ZERO;

        if (isFullTime) {
            insBase = insSalary != null && insSalary.compareTo(BigDecimal.ZERO) > 0 ? insSalary : baseSalary.add(responsibility);
            BigDecimal insCeiling = new BigDecimal("36000000");
            if (insBase.compareTo(insCeiling) > 0) {
                insBase = insCeiling;
            }
            bhxh = insBase.multiply(new BigDecimal("0.08")).setScale(2, RoundingMode.HALF_UP);
            bhyt = insBase.multiply(new BigDecimal("0.015")).setScale(2, RoundingMode.HALF_UP);
            bhtn = insBase.multiply(new BigDecimal("0.01")).setScale(2, RoundingMode.HALF_UP);
            totalIns = bhxh.add(bhyt).add(bhtn);
        }

        // 3. PIT Tax Calculation
        BigDecimal taxableMeal = meal.subtract(new BigDecimal("730000"));
        if (taxableMeal.compareTo(BigDecimal.ZERO) < 0) {
            taxableMeal = BigDecimal.ZERO;
        }
        BigDecimal taxableIncome = baseSalary.add(teachingCompensation).add(responsibility).add(performance).add(bonus).add(taxableMeal)
                .subtract(totalAttendanceDeduction);
        if (taxableIncome.compareTo(BigDecimal.ZERO) < 0) {
            taxableIncome = BigDecimal.ZERO;
        }

        BigDecimal personalDeduct = new BigDecimal("11000000");
        BigDecimal depDeduct = new BigDecimal("4400000").multiply(BigDecimal.valueOf(depCount));
        BigDecimal totalDeductions = personalDeduct.add(depDeduct).add(totalIns);

        BigDecimal assessedIncome = taxableIncome.subtract(totalDeductions);
        if (assessedIncome.compareTo(BigDecimal.ZERO) < 0) {
            assessedIncome = BigDecimal.ZERO;
        }

        BigDecimal pit = calculatePit(assessedIncome);

        // 4. Net Salary
        BigDecimal net = gross.subtract(totalIns).subtract(pit).subtract(otherDeduction);
        if (net.compareTo(BigDecimal.ZERO) < 0) {
            net = BigDecimal.ZERO;
        }

        entity.setBaseSalary(baseSalary);
        entity.setBonus(teachingCompensation.add(meal).add(phone).add(uniform).add(responsibility).add(performance).add(bonus));
        entity.setDeduction(totalIns.add(pit).add(otherDeduction).add(totalAttendanceDeduction));
        entity.setTotalSalary(net);

        if (entity.getDetails() != null) {
            entity.getDetails().clear();
        } else {
            entity.setDetails(new ArrayList<>());
        }

        addDetail(entity, "BASE_SALARY", baseSalary, isFullTime ? "Lương cơ bản" : "Lương dạy học (Part-time)");
        if (teachingCompensation.compareTo(BigDecimal.ZERO) > 0) {
            addDetail(entity, "TEACHING_COMPENSATION", teachingCompensation,
                    "Thù lao các buổi dạy đã xác nhận trong kỳ");
        }
        if (isFullTime) {
            addDetail(entity, "MEAL_ALLOWANCE", meal, "Phụ cấp ăn trưa");
            addDetail(entity, "PHONE_ALLOWANCE", phone, "Phụ cấp điện thoại");
            addDetail(entity, "UNIFORM_ALLOWANCE", uniform, "Phụ cấp trang phục");
            addDetail(entity, "RESPONSIBILITY_ALLOWANCE", responsibility, "Phụ cấp trách nhiệm");
            addDetail(entity, "PERFORMANCE_ALLOWANCE", performance, "Phụ cấp hiệu suất");
            addDetail(entity, "BONUS", bonus, "Tiền thưởng khác");
            addDetail(entity, "BHXH_DEDUCTION", bhxh, "Khấu trừ BHXH (8%)");
            addDetail(entity, "BHYT_DEDUCTION", bhyt, "Khấu trừ BHYT (1.5%)");
            addDetail(entity, "BHTN_DEDUCTION", bhtn, "Khấu trừ BHTN (1%)");
            addDetail(entity, "INSURANCE_SALARY", insBase, "Lương đóng bảo hiểm");
            addDetail(entity, "ABSENT_DEDUCTION", absentDeduct, "Khấu trừ vắng mặt");
            addDetail(entity, "HALFDAY_DEDUCTION", halfDayDeduct, "Khấu trừ làm nửa ngày");
            addDetail(entity, "LATE_DEDUCTION", lateDeduct, "Khấu trừ đi muộn");
        } else {
            if (bonus.compareTo(BigDecimal.ZERO) > 0) {
                addDetail(entity, "BONUS", bonus, "Tiền thưởng khác");
            }
        }
        addDetail(entity, "PERSONAL_DEDUCTION", personalDeduct, "Giảm trừ gia cảnh bản thân");
        addDetail(entity, "DEPENDENT_DEDUCTION", depDeduct, "Giảm trừ gia cảnh người phụ thuộc");
        addDetail(entity, "TAXABLE_INCOME", taxableIncome, "Thu nhập chịu thuế");
        addDetail(entity, "PIT_TAX", pit, "Thuế thu nhập cá nhân");
        addDetail(entity, "NET_PAY", net, "Lương thực lĩnh");
        addDetail(entity, "OTHER_DEDUCTION", otherDeduction, "Khấu trừ khác");
    }

    private void addDetail(SalaryEntity salary, String key, BigDecimal amount, String desc) {
        SalaryDetailEntity detail = SalaryDetailEntity.builder()
                .salary(salary)
                .itemKey(key)
                .amount(amount)
                .description(desc)
                .build();
        salary.getDetails().add(detail);
    }

    private BigDecimal calculatePit(BigDecimal assessedIncome) {
        double income = assessedIncome.doubleValue();
        double tax;
        if (income <= 5000000) {
            tax = income * 0.05;
        } else if (income <= 10000000) {
            tax = income * 0.1 - 250000;
        } else if (income <= 18000000) {
            tax = income * 0.15 - 750000;
        } else if (income <= 32000000) {
            tax = income * 0.2 - 1650000;
        } else if (income <= 52000000) {
            tax = income * 0.25 - 3250000;
        } else if (income <= 80000000) {
            tax = income * 0.3 - 5850000;
        } else {
            tax = income * 0.35 - 9850000;
        }
        return BigDecimal.valueOf(tax).setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional
    @Override
    public void delete(Long id) {
        log.info("Deleting salary record: {}", id);

        if (approvalRequestService.isLocked("SALARY", id)) {
            throw new BusinessException("Bảng lương đang trong quá trình phê duyệt, không thể xóa.");
        }

        SalaryEntity existing = salaryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        verifySalaryAccess(existing);

        String oldValue = SimpleJsonWriter.toJson(existing);
        if (existing.getStatus() != SalaryStatusEnum.DRAFT) {
            throw new BusinessException("Bảng lương đã duyệt hoặc đã thanh toán. Không thể xóa.");
        }

        existing.setDeletedAt(LocalDateTime.now());
        salaryRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "SALARY", id, oldValue, null));
    }

    @Transactional
    @Override
    public SalaryResponse approve(Long id) {
        log.info("Approving salary record: {}", id);
        SalaryEntity existing = salaryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (existing.getStatus() != SalaryStatusEnum.PENDING) {
            throw new BusinessException("Only salaries waiting for approval can be approved.");
        }

        existing.setStatus(SalaryStatusEnum.CONFIRMED);
        existing.setApprovedAt(LocalDateTime.now());
        SalaryEntity saved = salaryRepository.save(existing);
        notifyPayrollApprovedCreators(List.of(saved), saved.getPeriod(), saved.getApprovedAt());
        return salaryMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public SalaryResponse pay(Long id) {
        log.info("Paying salary record: {}", id);
        SalaryEntity existing = salaryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (existing.getStatus() != SalaryStatusEnum.CONFIRMED || existing.getPaidAt() == null) {
            throw new BusinessException("Transfer list must be exported before salary can be marked as paid.");
        }

        existing.setStatus(SalaryStatusEnum.PAID);
        existing.setPaidAt(LocalDateTime.now());
        SalaryEntity saved = salaryRepository.save(existing);

        // Transition related teaching session payments for PART_TIME to PAID
        if (saved.getEmployee().getEmploymentTypeEnum() == EmploymentTypeEnum.PART_TIME) {
            LocalDateTime start = saved.getPeriod().atDay(1).atStartOfDay();
            LocalDateTime end = saved.getPeriod().atEndOfMonth().atTime(23, 59, 59);
            List<TeachingSessionPaymentEntity> payments = teachingSessionPaymentRepository.findByEmployeeAndStatusAndPeriod(
                    saved.getEmployee().getUserId(),
                    SessionPaymentStatusEnum.CONFIRMED,
                    start,
                    end
            );
            for (TeachingSessionPaymentEntity p : payments) {
                p.setStatus(SessionPaymentStatusEnum.PAID);
                teachingSessionPaymentRepository.save(p);
            }
        }

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "PAY", "SALARY", id, saved, null));
        return salaryMapper.toResponse(saved);
    }

    /** Tổng hợp quỹ lương, trạng thái xử lý và xu hướng theo kỳ. */
    @Override
    public SalarySummaryResponse getSummary(YearMonth period) {
        YearMonth targetPeriod = period != null ? period : YearMonth.now();
        return getSummaryRange(targetPeriod, targetPeriod);
    }

    @Override
    public SalarySummaryResponse getSummaryRange(YearMonth periodFrom, YearMonth periodTo) {
        YearMonth from = periodFrom != null ? periodFrom : YearMonth.now();
        YearMonth to = periodTo != null ? periodTo : from;
        if (to.isBefore(from) || ChronoUnit.MONTHS.between(from, to) > 599) {
            throw new BusinessException("Salary period range must be between 1 and 600 months");
        }

        List<SalaryEntity> slips = restrictPayrollCreatorScope(
                salaryRepository.findByPeriodBetweenAndDeletedAtIsNull(from, to));

        long totalSlips = slips.size();
        long draftCount = slips.stream().filter(s -> s.getStatus() == SalaryStatusEnum.DRAFT).count();
        long pendingCount = slips.stream().filter(s -> s.getStatus() == SalaryStatusEnum.PENDING).count();
        long confirmedCount = slips.stream().filter(s -> s.getStatus() == SalaryStatusEnum.CONFIRMED).count();
        long paidCount = slips.stream().filter(s -> s.getStatus() == SalaryStatusEnum.PAID).count();

        BigDecimal totalSalaryPaid = slips.stream()
                .filter(s -> s.getTotalSalary() != null)
                .map(SalaryEntity::getTotalSalary)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Long> statusDistribution = new LinkedHashMap<>();
        statusDistribution.put("DRAFT", draftCount);
        statusDistribution.put("PENDING", pendingCount);
        statusDistribution.put("CONFIRMED", confirmedCount);
        statusDistribution.put("PAID", paidCount);

        Map<String, BigDecimal> salaryByDept = slips.stream()
                .collect(Collectors.groupingBy(
                        s -> (s.getEmployee() != null && s.getEmployee().getDepartment() != null && s.getEmployee().getDepartment().getName() != null)
                             ? s.getEmployee().getDepartment().getName() : "Khác",
                        Collectors.reducing(BigDecimal.ZERO, s -> s.getTotalSalary() != null ? s.getTotalSalary() : BigDecimal.ZERO, BigDecimal::add)
                ));

        List<SalaryTrendPoint> trend = new ArrayList<>();
        YearMonth startMonth = from.equals(to) ? to.minusMonths(5) : from;
        List<SalaryEntity> historicalSlips = restrictPayrollCreatorScope(
                salaryRepository.findByPeriodBetweenAndDeletedAtIsNull(startMonth, to));

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM/yyyy");
        YearMonth curr = startMonth;
        while (!curr.isAfter(to)) {
            YearMonth m = curr;
            BigDecimal sum = historicalSlips.stream()
                    .filter(s -> m.equals(s.getPeriod()))
                    .map(s -> s.getTotalSalary() != null ? s.getTotalSalary() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            trend.add(SalaryTrendPoint.builder()
                    .period(m.toString())
                    .periodLabel(m.format(fmt))
                    .totalSalary(sum)
                    .build());
            curr = curr.plusMonths(1);
        }

        return SalarySummaryResponse.builder()
                .period(from.equals(to) ? from.toString() : from + " — " + to)
                .totalSalaryPaid(totalSalaryPaid)
                .totalSlips(totalSlips)
                .draftCount(draftCount)
                .pendingCount(pendingCount)
                .confirmedCount(confirmedCount)
                .paidCount(paidCount)
                .statusDistribution(statusDistribution)
                .salaryByDepartment(salaryByDept)
                .historicalTrend(trend)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PayrollBatchResponse> getPayrollBatches(YearMonth periodFrom, YearMonth periodTo) {
        YearMonth from = periodFrom != null ? periodFrom : YearMonth.now();
        YearMonth to = periodTo != null ? periodTo : from;
        if (to.isBefore(from)) throw new BusinessException("Invalid payroll period range");
        return restrictPayrollCreatorScope(salaryRepository.findByPeriodBetweenAndDeletedAtIsNull(from, to)).stream()
                .collect(Collectors.groupingBy(SalaryEntity::getPeriod))
                .entrySet().stream().sorted(Map.Entry.<YearMonth, List<SalaryEntity>>comparingByKey().reversed())
                .map(entry -> {
                    List<SalaryEntity> slips = entry.getValue();
                    long draft = countStatus(slips, SalaryStatusEnum.DRAFT);
                    long pending = countStatus(slips, SalaryStatusEnum.PENDING);
                    long transferExported = slips.stream().filter(item -> item.getStatus() == SalaryStatusEnum.CONFIRMED
                            && item.getPaidAt() != null).count();
                    long confirmed = slips.stream().filter(item -> item.getStatus() == SalaryStatusEnum.CONFIRMED
                            && item.getPaidAt() == null).count();
                    long paid = countStatus(slips, SalaryStatusEnum.PAID);
                    String status = pending > 0 ? "PENDING"
                            : countStatus(slips, SalaryStatusEnum.REJECTED) > 0 ? "REJECTED"
                            : draft > 0 ? "DRAFT"
                            : confirmed > 0 ? "CONFIRMED"
                            : transferExported > 0 ? "TRANSFER_EXPORTED" : "PAID";
                    BigDecimal total = slips.stream().map(SalaryEntity::getTotalSalary)
                            .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
                    return PayrollBatchResponse.builder().id(entry.getKey().toString()).period(entry.getKey())
                            .status(status).slipCount(slips.size()).draftCount(draft).pendingCount(pending)
                            .confirmedCount(confirmed).transferExportedCount(transferExported)
                            .paidCount(paid).totalAmount(total)
                            .rejectionReason(slips.stream().map(SalaryEntity::getDescription)
                                    .filter(value -> value != null && value.startsWith("REJECTED: "))
                                    .map(value -> value.substring("REJECTED: ".length())).findFirst().orElse(null))
                            .submittedAt(resolveBatchSubmittedAt(slips))
                            .approvedAt(resolveBatchApprovedAt(slips))
                            .createdBy(slips.stream().map(SalaryEntity::getCreatedBy).filter(Objects::nonNull)
                                    .distinct().map(String::valueOf).findFirst().orElse(null))
                            .build();
                }).toList();
    }

    private long countStatus(List<SalaryEntity> slips, SalaryStatusEnum status) {
        return slips.stream().filter(item -> item.getStatus() == status).count();
    }

    /**
     * Các bảng lương được tạo trước khi có submitted_at vẫn phải hiển thị được mốc thời gian.
     * Với dữ liệu mới luôn ưu tiên timestamp nghiệp vụ; timestamp audit chỉ là fallback cho dữ liệu cũ.
     */
    private LocalDateTime resolveBatchSubmittedAt(List<SalaryEntity> slips) {
        LocalDateTime submittedAt = slips.stream().map(SalaryEntity::getSubmittedAt)
                .filter(Objects::nonNull).max(LocalDateTime::compareTo).orElse(null);
        if (submittedAt != null) return submittedAt;
        boolean wasSubmitted = slips.stream().anyMatch(item -> item.getStatus() != SalaryStatusEnum.DRAFT);
        if (!wasSubmitted) return null;
        return slips.stream().map(SalaryEntity::getUpdatedAt).filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElseGet(() -> slips.stream().map(SalaryEntity::getCreatedAt).filter(Objects::nonNull)
                        .max(LocalDateTime::compareTo).orElse(null));
    }

    private LocalDateTime resolveBatchApprovedAt(List<SalaryEntity> slips) {
        LocalDateTime approvedAt = slips.stream().map(SalaryEntity::getApprovedAt)
                .filter(Objects::nonNull).max(LocalDateTime::compareTo).orElse(null);
        if (approvedAt != null) return approvedAt;
        boolean wasApproved = slips.stream().anyMatch(item -> item.getStatus() == SalaryStatusEnum.CONFIRMED
                || item.getStatus() == SalaryStatusEnum.PAID);
        if (!wasApproved) return null;
        return slips.stream().map(SalaryEntity::getUpdatedAt).filter(Objects::nonNull)
                .max(LocalDateTime::compareTo).orElse(null);
    }

    @Override
    @Transactional
    public int submitPayroll(YearMonth period) {
        List<SalaryEntity> slips = salaryRepository.findByPeriodAndDeletedAtIsNull(period);
        if (slips.isEmpty()) throw new BusinessException("Payroll does not exist");
        if (isHrWithoutAdmin()) assertPayrollOwnedByCurrentHr(slips);
        if (slips.stream().anyMatch(item -> item.getStatus() != SalaryStatusEnum.DRAFT))
            throw new BusinessException("Only a fully draft payroll can be submitted");
        LocalDateTime submittedAt = LocalDateTime.now();
        slips.forEach(item -> { item.setStatus(SalaryStatusEnum.PENDING); item.setSubmittedAt(submittedAt); });
        salaryRepository.saveAll(slips);
        return slips.size();
    }

    @Override
    @Transactional
    public int cancelPayrollSubmission(YearMonth period) {
        List<SalaryEntity> slips = requirePayrollStatus(period, SalaryStatusEnum.PENDING,
                "Chỉ có thể hủy bảng lương đang chờ duyệt");
        assertPayrollOwnedByCurrentHr(slips);
        slips.forEach(item -> {
            item.setStatus(SalaryStatusEnum.DRAFT);
            item.setSubmittedAt(null);
            item.setApprovedAt(null);
        });
        salaryRepository.saveAll(slips);
        return slips.size();
    }

    @Override
    @Transactional
    public int approvePayroll(YearMonth period) {
        List<SalaryEntity> slips = requirePayrollStatus(period, SalaryStatusEnum.PENDING,
                "Only a payroll waiting for approval can be approved");
        LocalDateTime approvedAt = LocalDateTime.now();
        slips.forEach(item -> { item.setStatus(SalaryStatusEnum.CONFIRMED); item.setApprovedAt(approvedAt); });
        salaryRepository.saveAll(slips);
        notifyPayrollApprovedCreators(slips, period, approvedAt);
        return slips.size();
    }

    @Override
    @Transactional
    public int rejectPayroll(YearMonth period, String reason) {
        if (reason == null || reason.isBlank() || reason.trim().length() < 5)
            throw new BusinessException("Rejection reason must contain at least 5 characters");
        List<SalaryEntity> slips = requirePayrollStatus(period, SalaryStatusEnum.PENDING,
                "Only a payroll waiting for approval can be rejected");
        String normalizedReason = reason.trim();
        slips.forEach(item -> { item.setStatus(SalaryStatusEnum.REJECTED); item.setDescription("REJECTED: " + normalizedReason); });
        salaryRepository.saveAll(slips);
        notifyPayrollCreators(slips, period, normalizedReason);
        return slips.size();
    }

    @Override
    @Transactional
    public int resubmitPayroll(YearMonth period) {
        List<SalaryEntity> slips = requirePayrollStatus(period, SalaryStatusEnum.REJECTED,
                "Only a rejected payroll can be resubmitted");
        if (isHrWithoutAdmin()) assertPayrollOwnedByCurrentHr(slips);
        LocalDateTime resubmittedAt = LocalDateTime.now();
        slips.forEach(item -> { item.setStatus(SalaryStatusEnum.PENDING); item.setSubmittedAt(resubmittedAt); item.setApprovedAt(null); });
        salaryRepository.saveAll(slips);
        return slips.size();
    }

    private void notifyPayrollCreators(List<SalaryEntity> slips, YearMonth period, String reason) {
        List<Long> creatorIds = slips.stream().map(SalaryEntity::getCreatedBy).filter(Objects::nonNull).distinct().toList();
        List<UserEntity> recipients = creatorIds.isEmpty() ? List.of() : userRepository.findAllById(creatorIds);
        if (recipients.isEmpty()) {
            log.warn("Payroll {} has no valid createdBy; notification was not sent", period);
            return;
        }
        String title = "Bảng lương " + period + " bị từ chối";
        String content = "Admin đã từ chối bảng lương kỳ " + period + ". Lý do: " + reason + ". Vui lòng chỉnh sửa và gửi lại.";
        sendPayrollNotification(recipients, title, content, slips.getFirst().getId());
    }

    private void notifyPayrollApprovedCreators(List<SalaryEntity> slips, YearMonth period, LocalDateTime approvedAt) {
        if (slips == null || slips.isEmpty()) return;

        try {
            List<Long> creatorIds = slips.stream().map(SalaryEntity::getCreatedBy)
                    .filter(Objects::nonNull).distinct().toList();
            if (creatorIds.isEmpty()) {
                log.warn("Payroll {} has no createdBy; approval notification was not sent", period);
                return;
            }

            Set<Long> adminIds = userRepository.findUsersByRoleName("ADMIN", UserStatusEnum.DELETED).stream()
                    .map(UserEntity::getId).collect(Collectors.toSet());
            List<UserEntity> recipients = userRepository.findAllById(creatorIds).stream()
                    .filter(user -> !adminIds.contains(user.getId()))
                    .toList();
            if (recipients.isEmpty()) {
                log.info("Payroll {} was created by an Admin; approval notification was skipped", period);
                return;
            }

            BigDecimal totalAmount = slips.stream().map(SalaryEntity::getTotalSalary)
                    .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            String approvedTime = approvedAt != null
                    ? approvedAt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "";
            String title = "Bảng lương " + period + " đã được duyệt";
            String content = "Bảng lương kỳ " + period + " gồm " + slips.size()
                    + " phiếu, tổng thực nhận " + totalAmount.toPlainString()
                    + " VNĐ đã được duyệt lúc " + approvedTime + ".";

            sendPayrollNotification(recipients, title, content, slips.getFirst().getId());
        } catch (Exception exception) {
            log.error("Failed to notify payroll {} creators after approval", period, exception);
        }
    }

    @Override
    @Transactional
    public int deleteDraftPayroll(YearMonth period) {
        List<SalaryEntity> slips = salaryRepository.findByPeriodAndDeletedAtIsNull(period);
        if (slips.isEmpty()) throw new BusinessException("Draft payroll does not exist");
        boolean isAdmin = getCurrentUserRoles().contains("ROLE_ADMIN");
        if (!isAdmin) {
            assertPayrollOwnedByCurrentHr(slips);
            if (slips.stream().anyMatch(item -> item.getStatus() != SalaryStatusEnum.DRAFT
                    && item.getStatus() != SalaryStatusEnum.PENDING))
                throw new BusinessException("HR chỉ được xóa bảng lương nháp hoặc đang chờ duyệt do mình tạo");
        } else if (slips.stream().anyMatch(item -> item.getStatus() != SalaryStatusEnum.DRAFT)) {
            throw new BusinessException("Only a fully draft payroll can be deleted");
        }
        for (SalaryEntity slip : slips) {
            if (approvalRequestService.isLocked("SALARY", slip.getId()))
                throw new BusinessException("Payroll has an approval request and cannot be deleted");
        }
        slips.forEach(item -> item.setDeletedAt(LocalDateTime.now()));
        salaryRepository.saveAll(slips);
        return slips.size();
    }

    private void assertPayrollOwnedByCurrentHr(List<SalaryEntity> slips) {
        Long currentUserId = getCurrentUserId();
        if (slips.stream().anyMatch(item -> item.getCreatedBy() == null
                || !currentUserId.equals(item.getCreatedBy()))) {
            throw new BusinessException("HR chỉ được thao tác với bảng lương do mình tạo");
        }
    }

    @Override
    @Transactional
    public int deleteApprovedPayroll(YearMonth period) {
        List<SalaryEntity> slips = salaryRepository.findByPeriodAndDeletedAtIsNull(period);
        if (slips.isEmpty()) throw new BusinessException("Payroll does not exist");
        for (SalaryEntity slip : slips) {
            applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "SALARY", slip.getId(),
                    SimpleJsonWriter.toJson(slip), null));
        }
        slips.forEach(item -> item.setDeletedAt(LocalDateTime.now()));
        salaryRepository.saveAll(slips);
        return slips.size();
    }

    @Override
    public List<SalaryResponse> getTrash() {
        return salaryMapper.toResponseList(salaryRepository.findByDeletedAtIsNotNull());
    }

    @Override
    @Transactional
    public int restorePayroll(YearMonth period) {
        List<SalaryEntity> slips = getTrashPayroll(period);
        slips.forEach(item -> item.setDeletedAt(null));
        salaryRepository.saveAll(slips);
        return slips.size();
    }

    @Override
    @Transactional
    public int hardDeletePayroll(YearMonth period) {
        List<SalaryEntity> slips = getTrashPayroll(period);
        salaryRepository.deleteAll(slips);
        return slips.size();
    }

    @Override
    @Transactional
    public byte[] exportTransferList(YearMonth period) {
        List<SalaryEntity> slips = requirePayrollStatus(period, SalaryStatusEnum.CONFIRMED,
                "Only a fully approved payroll can be exported for transfer");
        byte[] csv = exportCsvRange(period, period, null, SalaryStatusEnum.CONFIRMED);
        slips.forEach(item -> item.setPaidAt(LocalDateTime.now()));
        salaryRepository.saveAll(slips);
        return csv;
    }

    @Override
    @Transactional
    public int markPayrollPaid(YearMonth period) {
        List<SalaryEntity> slips = salaryRepository.findByPeriodAndDeletedAtIsNull(period);
        if (slips.isEmpty() || slips.stream().anyMatch(item -> item.getStatus() != SalaryStatusEnum.CONFIRMED
                || item.getPaidAt() == null))
            throw new BusinessException("Transfer list must be exported before the payroll can be paid");
        slips.forEach(item -> { item.setStatus(SalaryStatusEnum.PAID); item.setPaidAt(LocalDateTime.now()); });
        salaryRepository.saveAll(slips);
        return slips.size();
    }

    /** Tạo bảng lương cho các nhân viên đủ điều kiện trong kỳ yêu cầu. */
    @Transactional
    @Override
    public int generatePeriod(GenerateSalaryPeriodRequest request) {
        YearMonth period = request.getPeriod() != null ? request.getPeriod() : YearMonth.now();
        log.info("Generating batch salary slips for period: {}", period);

        List<SalaryEntity> existingPeriod = salaryRepository.findByPeriodAndDeletedAtIsNull(period);
        if (isHrWithoutAdmin() && !existingPeriod.isEmpty()) {
            assertPayrollOwnedByCurrentHr(existingPeriod);
        }
        if (existingPeriod.stream().anyMatch(item -> item.getStatus() != SalaryStatusEnum.DRAFT
                && item.getStatus() != SalaryStatusEnum.REJECTED)) {
            throw new BusinessException("Bảng lương kỳ " + period + " đã gửi duyệt hoặc đã duyệt, không thể tính lại");
        }

        List<EmployeeEntity> activeEmployees = employeeRepository.findAll().stream()
                .filter(e -> e.getStatus() == null || e.getStatus() == EmployeeStatusEnum.ACTIVE)
                .toList();

        int generatedCount = 0;

        for (EmployeeEntity emp : activeEmployees) {
            Optional<SalaryEntity> existingOpt = salaryRepository.findByEmployee_UserIdAndPeriodAndDeletedAtIsNull(emp.getUserId(), period);

            List<EmployeeContractEntity> activeContracts = employeeContractRepository.findByEmployee_UserId(emp.getUserId()).stream()
                    .filter(c -> c.getStatus() == BaseStatusEnum.ACTIVE)
                    .filter(c -> !c.getStartDate().isAfter(period.atEndOfMonth()))
                    .filter(c -> c.getEndDate() == null || !c.getEndDate().isBefore(period.atDay(1)))
                    .toList();

            if (activeContracts.isEmpty()) {
                continue;
            }

            EmployeeContractEntity contract = activeContracts.stream()
                    .max(Comparator.comparing(EmployeeContractEntity::getStartDate))
                    .get();

            SalaryEntity entity = existingOpt.orElseGet(() -> SalaryEntity.builder()
                    .employee(emp)
                    .period(period)
                    .status(SalaryStatusEnum.DRAFT)
                    .build());

            entity.setSalaryTypeEnum(contract.getSalaryTypeEnum());

            calculateSalaryForEmployee(entity,
                    emp,
                    contract,
                    period,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    null,
                    0,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO
            );

            salaryRepository.save(entity);
            generatedCount++;
        }

        if (generatedCount == 0) {
            throw new BusinessException("Không có nhân viên đang hoạt động với hợp đồng hợp lệ để tạo bảng lương kỳ " + period);
        }

        return generatedCount;
    }

    @Transactional
    @Override
    public void bulkApprove(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return;
        for (Long id : ids) {
            try {
                approve(id);
            } catch (Exception e) {
                log.warn("Failed to approve salary slip {}: {}", id, e.getMessage());
            }
        }
    }

    @Transactional
    @Override
    public SalaryResponse markPaid(Long id) {
        return pay(id);
    }

    @Transactional
    @Override
    public void bulkMarkPaid(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return;
        for (Long id : ids) {
            try {
                pay(id);
            } catch (Exception e) {
                log.warn("Failed to mark paid salary slip {}: {}", id, e.getMessage());
            }
        }
    }

    /** Xuất bảng lương theo kỳ, phòng ban và trạng thái. */
    @Override
    public byte[] exportCsv(YearMonth period, Long departmentId, SalaryStatusEnum status) {
        YearMonth targetPeriod = period != null ? period : YearMonth.now();
        return exportCsvRange(targetPeriod, targetPeriod, departmentId, status);
    }

    @Override
    public byte[] exportCsvRange(YearMonth periodFrom, YearMonth periodTo, Long departmentId, SalaryStatusEnum status) {
        YearMonth from = periodFrom != null ? periodFrom : YearMonth.now();
        YearMonth to = periodTo != null ? periodTo : from;
        if (to.isBefore(from) || ChronoUnit.MONTHS.between(from, to) > 599) {
            throw new BusinessException("Salary period range must be between 1 and 600 months");
        }
        List<SalaryEntity> list = restrictPayrollCreatorScope(
                salaryRepository.findByPeriodBetweenAndDeletedAtIsNull(from, to));

        if (departmentId != null) {
            list = list.stream()
                    .filter(s -> s.getEmployee() != null && s.getEmployee().getDepartment() != null && departmentId.equals(s.getEmployee().getDepartment().getId()))
                    .toList();
        }
        if (status != null) {
            list = list.stream()
                    .filter(s -> status.equals(s.getStatus()))
                    .toList();
        }

        StringBuilder csv = new StringBuilder();
        csv.append("\uFEFF");
        csv.append("Mã phiếu,Mã NV,Tên NV,Phòng ban,Kỳ lương,Lương cơ bản,Thưởng,Khấu trừ,Thực nhận,Trạng thái,Ngày thanh toán\n");

        for (SalaryEntity s : list) {
            csv.append(s.getId()).append(",")
               .append(s.getEmployee() != null ? s.getEmployee().getEmployeeCode() : "").append(",")
               .append(s.getEmployee() != null && s.getEmployee().getUserEntity() != null ? s.getEmployee().getUserEntity().getFullName() : "").append(",")
               .append(s.getEmployee() != null && s.getEmployee().getDepartment() != null ? s.getEmployee().getDepartment().getName() : "").append(",")
               .append(s.getPeriod()).append(",")
               .append(s.getBaseSalary() != null ? s.getBaseSalary() : 0).append(",")
               .append(s.getBonus() != null ? s.getBonus() : 0).append(",")
               .append(s.getDeduction() != null ? s.getDeduction() : 0).append(",")
               .append(s.getTotalSalary() != null ? s.getTotalSalary() : 0).append(",")
               .append(s.getStatus()).append(",")
               .append(s.getPaidAt() != null ? s.getPaidAt() : "").append("\n");
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private List<SalaryEntity> requirePayrollStatus(
            YearMonth period, SalaryStatusEnum requiredStatus, String errorMessage) {
        List<SalaryEntity> slips = salaryRepository.findByPeriodAndDeletedAtIsNull(period);
        if (slips.isEmpty() || slips.stream().anyMatch(item -> item.getStatus() != requiredStatus)) {
            throw new BusinessException(errorMessage);
        }
        return slips;
    }

    private List<SalaryEntity> getTrashPayroll(YearMonth period) {
        List<SalaryEntity> slips = salaryRepository.findByDeletedAtIsNotNull().stream()
                .filter(item -> period.equals(item.getPeriod()))
                .toList();
        if (slips.isEmpty()) {
            throw new BusinessException("Payroll is not in trash");
        }
        return slips;
    }

    private void sendPayrollNotification(
            List<UserEntity> recipients, String title, String content, Long referenceId) {
        recipients.forEach(recipient -> notificationService.createSystemNotification(
                recipient, NotificationTypeEnum.GENERAL, title, content, referenceId, "/admin/salaries"));
        List<String> emails = recipients.stream()
                .filter(user -> user.getEmail() != null && !user.getEmail().isBlank())
                .map(UserEntity::getEmail)
                .distinct()
                .toList();
        if (!emails.isEmpty()) {
            emailService.sendBulkEmail(emails, title, content);
        }
    }

    @Override
    public PageResponse<SalaryResponse> search(SalarySearchRequest request) {
        log.info("Searching Salary via specification");
        Specification<SalaryEntity> spec = SalarySpecification.filterAndSearch(request);
        spec = spec.and(getSalarySecuritySpecification());
        Pageable pageable = request.toPageable();
        Page<SalaryEntity> page = salaryRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(salaryMapper::toResponse));
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getUser().getId();
        }
        throw new BusinessException("User is not authenticated");
    }

    private List<String> getCurrentUserRoles() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Collections.emptyList();
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
    }

    private void verifyEmployeeAccess(Long employeeId) {
        Long currentUserId = getCurrentUserId();
        List<String> roles = getCurrentUserRoles();

        if (roles.contains("ROLE_ADMIN") || roles.contains("ROLE_HR")) {
            return;
        }

        if (currentUserId.equals(employeeId)) {
            return;
        }

        throw new BusinessException("Access denied to requested employee data");
    }

    private void verifySalaryAccess(SalaryEntity salary) {
        if (isHrWithoutAdmin() && !Objects.equals(salary.getCreatedBy(), getCurrentUserId())) {
            throw new BusinessException("HR chỉ được xem và chỉnh sửa bảng lương do mình tạo");
        }
        verifyEmployeeAccess(salary.getEmployee().getUserId());
    }

    private Specification<SalaryEntity> getSalarySecuritySpecification() {
        Long currentUserId = getCurrentUserId();
        List<String> roles = getCurrentUserRoles();

        if (roles.contains("ROLE_ADMIN")) {
            return Specification.unrestricted();
        }

        if (roles.contains("ROLE_HR")) {
            return (root, ignoredQuery, cb) -> cb.equal(root.get("createdBy"), currentUserId);
        }

        return (root, ignoredQuery, cb) -> cb.equal(root.get("employee").get("userId"), currentUserId);
    }

    /** Giới hạn dữ liệu bảng lương của HR theo createdBy; Admin giữ phạm vi toàn hệ thống. */
    private List<SalaryEntity> restrictPayrollCreatorScope(List<SalaryEntity> salaries) {
        if (!isHrWithoutAdmin()) return salaries;
        Long currentUserId = getCurrentUserId();
        return salaries.stream().filter(item -> Objects.equals(item.getCreatedBy(), currentUserId)).toList();
    }

    /** Kiểm tra người dùng chỉ có vai trò HR mà không đồng thời là Admin. */
    private boolean isHrWithoutAdmin() {
        List<String> roles = getCurrentUserRoles();
        return roles.contains("ROLE_HR") && !roles.contains("ROLE_ADMIN");
    }
}
