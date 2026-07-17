package com.ailms.service.imp;
import com.ailms.entity.SalaryDetailEntity;
import com.ailms.repository.specification.SalarySpecification;
import com.ailms.request.CreateSalaryRequest;
import com.ailms.request.SalarySearchRequest;
import com.ailms.request.UpdateSalaryRequest;
import com.ailms.service.ISalaryService;


import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.SalaryEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.SalaryMapper;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.SalaryRepository;
import com.ailms.response.SalaryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.SalaryStatusEnum;
import com.ailms.exception.BusinessException;
import com.ailms.repository.EmployeeContractRepository;
import com.ailms.entity.EmployeeContractEntity;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SalaryService implements ISalaryService {

    private final SalaryRepository salaryRepository;
    private final EmployeeRepository employeeRepository;
    private final SalaryMapper salaryMapper;
    private final EmployeeContractRepository employeeContractRepository;
    private final com.ailms.service.IApprovalRequestService approvalRequestService;
    private final com.ailms.repository.SalaryDetailRepository salaryDetailRepository;
    private final com.ailms.repository.AttendanceRepository attendanceRepository;
    private final com.ailms.repository.TeachingSessionPaymentRepository teachingSessionPaymentRepository;

    private static final String RESOURCE_NAME = "Salary";

    public List<SalaryResponse> getAll() {
        log.info("Getting all salary records");
        return salaryMapper.toResponseList(salaryRepository.findAll());
    }

    public SalaryResponse getById(Long id) {
        log.info("Getting salary record by id: {}", id);
        SalaryEntity entity = salaryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        verifySalaryAccess(entity);
        return salaryMapper.toResponse(entity);
    }

    public List<SalaryResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting salary records for employee: {}", employeeId);
        verifyEmployeeAccess(employeeId);
        return salaryMapper.toResponseList(salaryRepository.findByEmployee_UserId(employeeId));
    }

    @Transactional
    public SalaryResponse create(CreateSalaryRequest request) {
        log.info("Creating salary record for employee: {} and period: {}", request.getEmployeeId(), request.getPeriod());

        if (salaryRepository.existsByEmployee_UserIdAndPeriod(request.getEmployeeId(), request.getPeriod())) {
            throw new DuplicateResourceException("Salary record already exists for employee ID: " + request.getEmployeeId() + " and period: " + request.getPeriod());
        }

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        if (employee.getStatus() == EmployeeStatusEnum.DELETE) {
            throw new BusinessException("Employee is deleted. Cannot create salary record.");
        }

        // Resolve contract for the period
        List<EmployeeContractEntity> activeContracts = employeeContractRepository.findByEmployee_UserId(request.getEmployeeId()).stream()
                .filter(c -> c.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(c -> !c.getStartDate().isAfter(request.getPeriod().atEndOfMonth()))
                .filter(c -> c.getEndDate() == null || !c.getEndDate().isBefore(request.getPeriod().atDay(1)))
                .toList();

        if (activeContracts.isEmpty()) {
            throw new BusinessException("Nhân viên chưa có hợp đồng hiệu lực cho kỳ lương này");
        }

        if (activeContracts.size() > 1) {
            log.warn("Multiple active contracts found for employee ID: {} in period: {}", request.getEmployeeId(), request.getPeriod());
        }

        EmployeeContractEntity contract = activeContracts.stream()
                .max(java.util.Comparator.comparing(EmployeeContractEntity::getStartDate))
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
        return salaryMapper.toResponse(saved);
    }

    @Transactional
    public SalaryResponse update(Long id, UpdateSalaryRequest request) {
        log.info("Updating salary record: {}", id);

        if (approvalRequestService.isLocked("SALARY", id)) {
            throw new BusinessException("Bảng lương đang trong quá trình phê duyệt, không thể chỉnh sửa.");
        }

        SalaryEntity existing = salaryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (existing.getStatus() != SalaryStatusEnum.DRAFT) {
            throw new BusinessException("Only draft salaries can be updated.");
        }

        if (request.getPeriod() != null && !request.getPeriod().equals(existing.getPeriod())) {
            throw new BusinessException("Cannot change period of salary record.");
        }

        // Resolve contract for the period
        List<EmployeeContractEntity> activeContracts = employeeContractRepository.findByEmployee_UserId(existing.getEmployee().getUserId()).stream()
                .filter(c -> c.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(c -> !c.getStartDate().isAfter(existing.getPeriod().atEndOfMonth()))
                .filter(c -> c.getEndDate() == null || !c.getEndDate().isBefore(existing.getPeriod().atDay(1)))
                .toList();

        if (activeContracts.isEmpty()) {
            throw new BusinessException("Nhân viên chưa có hợp đồng hiệu lực cho kỳ lương này");
        }

        EmployeeContractEntity contract = activeContracts.stream()
                .max(java.util.Comparator.comparing(EmployeeContractEntity::getStartDate))
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
        return salaryMapper.toResponse(updated);
    }

    private BigDecimal getDetailAmount(SalaryEntity entity, String key) {
        if (entity.getDetails() == null) return BigDecimal.ZERO;
        return entity.getDetails().stream()
                .filter(d -> key.equals(d.getItemKey()))
                .map(com.ailms.entity.SalaryDetailEntity::getAmount)
                .findFirst()
                .orElse(BigDecimal.ZERO);
    }

    private Integer getDependentsCount(SalaryEntity entity) {
        if (entity.getDetails() == null) return 0;
        BigDecimal amt = entity.getDetails().stream()
                .filter(d -> "DEPENDENT_DEDUCTION".equals(d.getItemKey()))
                .map(com.ailms.entity.SalaryDetailEntity::getAmount)
                .findFirst()
                .orElse(BigDecimal.ZERO);
        if (amt.compareTo(BigDecimal.ZERO) == 0) return 0;
        return amt.divide(new BigDecimal("4400000"), 0, java.math.RoundingMode.HALF_UP).intValue();
    }

    private void calculateSalaryForEmployee(SalaryEntity entity,
                                           EmployeeEntity employee,
                                           EmployeeContractEntity contract,
                                           java.time.YearMonth period,
                                           BigDecimal meal,
                                           BigDecimal phone,
                                           BigDecimal uniform,
                                           BigDecimal responsibility,
                                           BigDecimal performance,
                                           BigDecimal insSalary,
                                           Integer dependents,
                                           BigDecimal bonus,
                                           BigDecimal otherDeduction) {
        boolean isFullTime = employee.getEmploymentTypeEnum() == com.ailms.entity.enums.EmploymentTypeEnum.FULL_TIME;
        
        BigDecimal baseSalary = contract.getBaseSalary();
        BigDecimal absentDeduct = BigDecimal.ZERO;
        BigDecimal halfDayDeduct = BigDecimal.ZERO;
        BigDecimal lateDeduct = BigDecimal.ZERO;

        if (isFullTime) {
            java.time.LocalDateTime start = period.atDay(1).atStartOfDay();
            java.time.LocalDateTime end = period.atEndOfMonth().atTime(23, 59, 59);
            List<com.ailms.entity.AttendanceEntity> attendances = attendanceRepository.findByEmployeeAndDateRange(employee.getUserId(), start, end);
            int absentCount = 0;
            int halfDayCount = 0;
            int lateCount = 0;
            for (com.ailms.entity.AttendanceEntity att : attendances) {
                if (att.getStatus() == com.ailms.entity.enums.AttendanceStatusEnum.ABSENT) {
                    absentCount++;
                } else if (att.getStatus() == com.ailms.entity.enums.AttendanceStatusEnum.HALF_DAY) {
                    halfDayCount++;
                } else if (att.getStatus() == com.ailms.entity.enums.AttendanceStatusEnum.LATE) {
                    lateCount++;
                }
            }
            BigDecimal dailyWage = contract.getBaseSalary().divide(new BigDecimal("22"), 2, java.math.RoundingMode.HALF_UP);
            absentDeduct = dailyWage.multiply(BigDecimal.valueOf(absentCount));
            halfDayDeduct = dailyWage.multiply(new BigDecimal("0.5")).multiply(BigDecimal.valueOf(halfDayCount));
            lateDeduct = dailyWage.multiply(new BigDecimal("0.1")).multiply(BigDecimal.valueOf(lateCount));
        } else {
            // PART_TIME: baseSalary = SUM(teaching_session_payment.amount)
            java.time.LocalDateTime start = period.atDay(1).atStartOfDay();
            java.time.LocalDateTime end = period.atEndOfMonth().atTime(23, 59, 59);
            List<com.ailms.entity.TeachingSessionPaymentEntity> payments = teachingSessionPaymentRepository.findByEmployeeAndStatusAndPeriod(
                employee.getUserId(),
                com.ailms.entity.enums.SessionPaymentStatusEnum.CONFIRMED,
                start,
                end
            );
            baseSalary = payments.stream()
                .map(com.ailms.entity.TeachingSessionPaymentEntity::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            // Allowances for part-time are 0 by default
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
                lateDeduct
        );
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
                                            BigDecimal lateDeduct) {
        meal = meal != null ? meal : BigDecimal.ZERO;
        phone = phone != null ? phone : BigDecimal.ZERO;
        uniform = uniform != null ? uniform : BigDecimal.ZERO;
        responsibility = responsibility != null ? responsibility : BigDecimal.ZERO;
        performance = performance != null ? performance : BigDecimal.ZERO;
        bonus = bonus != null ? bonus : BigDecimal.ZERO;
        otherDeduction = otherDeduction != null ? otherDeduction : BigDecimal.ZERO;
        int depCount = dependents != null ? dependents : 0;

        BigDecimal totalAttendanceDeduction = absentDeduct.add(halfDayDeduct).add(lateDeduct);

        // 1. Gross Salary
        BigDecimal gross = baseSalary.add(meal).add(phone).add(uniform).add(responsibility).add(performance).add(bonus)
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
            bhxh = insBase.multiply(new BigDecimal("0.08")).setScale(2, java.math.RoundingMode.HALF_UP);
            bhyt = insBase.multiply(new BigDecimal("0.015")).setScale(2, java.math.RoundingMode.HALF_UP);
            bhtn = insBase.multiply(new BigDecimal("0.01")).setScale(2, java.math.RoundingMode.HALF_UP);
            totalIns = bhxh.add(bhyt).add(bhtn);
        }

        // 3. PIT Tax Calculation
        BigDecimal taxableMeal = meal.subtract(new BigDecimal("730000"));
        if (taxableMeal.compareTo(BigDecimal.ZERO) < 0) {
            taxableMeal = BigDecimal.ZERO;
        }
        BigDecimal taxableIncome = baseSalary.add(responsibility).add(performance).add(bonus).add(taxableMeal)
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

        // Update main SalaryEntity fields
        entity.setBaseSalary(baseSalary);
        entity.setBonus(meal.add(phone).add(uniform).add(responsibility).add(performance).add(bonus));
        entity.setDeduction(totalIns.add(pit).add(otherDeduction).add(totalAttendanceDeduction));
        entity.setTotalSalary(net);

        // Clear existing details
        if (entity.getDetails() != null) {
            entity.getDetails().clear();
        } else {
            entity.setDetails(new java.util.ArrayList<>());
        }

        addDetail(entity, "BASE_SALARY", baseSalary, isFullTime ? "Lương cơ bản" : "Lương dạy học (Part-time)");
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
        double tax = 0;
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
        return BigDecimal.valueOf(tax).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting salary record: {}", id);

        if (approvalRequestService.isLocked("SALARY", id)) {
            throw new BusinessException("Bảng lương đang trong quá trình phê duyệt, không thể xóa.");
        }

        SalaryEntity existing = salaryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (existing.getStatus() != SalaryStatusEnum.DRAFT) {
            throw new BusinessException("Bảng lương đã duyệt hoặc đã thanh toán. Không thể xóa.");
        }

        salaryRepository.delete(existing);
    }

    @Transactional
    public SalaryResponse approve(Long id) {
        log.info("Approving salary record: {}", id);
        SalaryEntity existing = salaryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (existing.getStatus() != SalaryStatusEnum.DRAFT) {
            throw new BusinessException("Only DRAFT salaries can be approved.");
        }

        existing.setStatus(SalaryStatusEnum.CONFIRMED);
        SalaryEntity saved = salaryRepository.save(existing);
        return salaryMapper.toResponse(saved);
    }

    @Transactional
    public SalaryResponse pay(Long id) {
        log.info("Paying salary record: {}", id);
        SalaryEntity existing = salaryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (existing.getStatus() != SalaryStatusEnum.CONFIRMED && existing.getStatus() != SalaryStatusEnum.DRAFT) {
            throw new BusinessException("Salary record must be in DRAFT or APPROVED status to be paid.");
        }

        existing.setStatus(SalaryStatusEnum.PAID);
        existing.setPaidAt(LocalDateTime.now());
        SalaryEntity saved = salaryRepository.save(existing);
        return salaryMapper.toResponse(saved);
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
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof com.ailms.security.CustomUserDetails userDetails) {
            return userDetails.getUser().getId();
        }
        throw new BusinessException("User is not authenticated");
    }

    private List<String> getCurrentUserRoles() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return java.util.Collections.emptyList();
        }
        return auth.getAuthorities().stream()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .toList();
    }

    private void verifyEmployeeAccess(Long employeeId) {
        Long currentUserId = getCurrentUserId();
        List<String> roles = getCurrentUserRoles();

        if (roles.contains("ROLE_PAYROLL") || roles.contains("ROLE_HR")) {
            return; // HR and Payroll can access all
        }

        if (roles.contains("ROLE_ADMIN")) {
            throw new BusinessException("Admin does not have access to contract/salary details.");
        }

        if (currentUserId.equals(employeeId)) {
            return; // Self access
        }

        if (roles.contains("ROLE_MANAGER")) {
            EmployeeEntity managerEmp = employeeRepository.findById(currentUserId).orElse(null);
            EmployeeEntity targetEmp = employeeRepository.findById(employeeId).orElse(null);
            if (managerEmp != null && targetEmp != null 
                    && managerEmp.getDepartment() != null 
                    && targetEmp.getDepartment() != null
                    && managerEmp.getDepartment().getId().equals(targetEmp.getDepartment().getId())) {
                return; // Manager of the same department
            }
        }

        throw new BusinessException("Access denied to requested employee data");
    }

    private void verifySalaryAccess(SalaryEntity salary) {
        verifyEmployeeAccess(salary.getEmployee().getUserId());
    }

    private Specification<SalaryEntity> getSalarySecuritySpecification() {
        Long currentUserId = getCurrentUserId();
        List<String> roles = getCurrentUserRoles();

        if (roles.contains("ROLE_PAYROLL") || roles.contains("ROLE_HR")) {
            return (root, query, cb) -> cb.conjunction();
        }

        if (roles.contains("ROLE_ADMIN")) {
            return (root, query, cb) -> cb.disjunction();
        }

        Specification<SalaryEntity> spec = (root, query, cb) -> cb.disjunction();

        if (roles.contains("ROLE_MANAGER")) {
            EmployeeEntity managerEmp = employeeRepository.findById(currentUserId).orElse(null);
            if (managerEmp != null && managerEmp.getDepartment() != null) {
                Long deptId = managerEmp.getDepartment().getId();
                spec = spec.or((root, query, cb) -> cb.equal(root.get("employee").get("department").get("id"), deptId));
            }
        }

        spec = spec.or((root, query, cb) -> cb.equal(root.get("employee").get("userId"), currentUserId));

        return spec;
    }
}
