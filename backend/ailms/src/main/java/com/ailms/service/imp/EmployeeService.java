package com.ailms.service.imp;

import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.common.util.CodeGenerator;
import com.ailms.entity.*;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.EmploymentTypeEnum;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.EmployeeMapper;
import com.ailms.repository.*;
import com.ailms.request.CreateEmployeeContractRequest;
import com.ailms.request.CreateEmployeeRequest;
import com.ailms.request.EmployeeSearchRequest;
import com.ailms.request.UpdateEmployeeRequest;
import com.ailms.response.EmployeeResponse;
import com.ailms.response.PageResponse;
import com.ailms.security.JwtUtils;
import com.ailms.service.IEmailService;
import com.ailms.service.IEmployeeContractService;
import com.ailms.service.IEmployeeService;
import com.ailms.common.util.CsvBuilder;
import com.ailms.common.util.CsvExport;
import com.ailms.common.util.SortFieldResolver;
import java.util.function.Function;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import com.ailms.repository.specification.EmployeeSpecification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class EmployeeService implements IEmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmployeeMapper employeeMapper;
    private final EmployeeContractRepository employeeContractRepository;
    private final IEmployeeContractService employeeContractService;
    private final SalaryRepository salaryRepository;
    private final TeachingRateRepository teachingRateRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final SortFieldResolver sortFieldResolver;
    private final IEmailService emailService;
    private final JwtUtils jwtUtils;
    private final ApplicationEventPublisher applicationEventPublisher;

    private static final String RESOURCE_NAME = "Employee";

    @Override
    public List<EmployeeResponse> getAll() {
        log.info("Getting all employees excluding deleted ones");
        return employeeMapper.toResponseList(employeeRepository.findAllByUserEntity_StatusNot(UserStatusEnum.DELETED));
    }

    @Override
    public EmployeeResponse getById(Long id) {
        log.info("Getting employee by id: {}", id);
        EmployeeEntity entity = employeeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        if (entity.getUserEntity().getStatus() == UserStatusEnum.DELETED) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        return employeeMapper.toResponse(entity);
    }

    @Transactional
    @Override
    public EmployeeResponse create(CreateEmployeeRequest request) {
        log.info("Creating employee");

        UserEntity user;
        if (request.getUserId() != null) {
            user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> ResourceNotFoundException.of("User", request.getUserId()));

            if (employeeRepository.existsById(request.getUserId())) {
                throw new DuplicateResourceException("Employee profile already exists for user ID: " + request.getUserId());
            }
        } else {
            // HR creating new user account + employee profile in one step
            if (request.getEmail() == null || request.getEmail().isBlank()) {
                throw new BusinessException("Email là bắt buộc để tạo nhân viên mới.");
            }

            java.util.Optional<UserEntity> existingUserOpt = userRepository.findByEmail(request.getEmail().trim());
            if (existingUserOpt.isPresent()) {
                user = existingUserOpt.get();
                if (employeeRepository.existsById(user.getId())) {
                    throw new DuplicateResourceException("Tài khoản với email này đã là nhân sự trong hệ thống: " + request.getEmail());
                }
            } else {
                String tempPassword = request.getPassword() != null && !request.getPassword().isBlank()
                        ? request.getPassword()
                        : "Password@123";

                user = UserEntity.builder()
                        .username(request.getEmail().trim())
                        .email(request.getEmail().trim())
                        .passwordHash(passwordEncoder.encode(tempPassword))
                        .fullName(request.getFullName() != null ? request.getFullName() : request.getEmail().trim())
                        .status(UserStatusEnum.ACTIVE)
                        .build();
                user = userRepository.save(user);

                // Assign Role
                Long roleId = request.getRoleId();
                RoleEntity role = null;
                if (roleId != null) {
                    role = roleRepository.findById(roleId)
                            .orElseThrow(() -> ResourceNotFoundException.of("Role", roleId));
                } else {
                    role = roleRepository.findByCode("EMPLOYEE")
                            .orElseGet(() -> roleRepository.findAll().stream().findFirst()
                                    .orElseThrow(() -> ResourceNotFoundException.of("Role", "EMPLOYEE")));
                }

                UserRoleEntity userRole = UserRoleEntity.builder()
                        .userEntity(user)
                        .roleEntity(role)
                        .build();
                userRoleRepository.save(userRole);

                // Send JWT invite set-password email
                final String recipientEmail = user.getEmail();
                final String jwtToken = jwtUtils.generateSetPasswordToken(user.getId());
                try {
                    emailService.sendSetPasswordEmail(recipientEmail, jwtToken);
                } catch (Exception e) {
                    log.error("Failed to send welcome set-password email to {}", recipientEmail, e);
                }
            }
        }

        EmployeeEntity entity = employeeMapper.toEntity(request);
        entity.setUserEntity(user);
        entity.setEmployeeCode(CodeGenerator.generate("EP", employeeRepository::existsByEmployeeCode));
        entity.setStatus(EmployeeStatusEnum.ACTIVE);
        entity.setDepartment(resolveDepartment(request.getDepartmentId()));
        if (entity.getStartDate() == null) {
            entity.setStartDate(LocalDateTime.now());
        }

        EmployeeEntity saved = employeeRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "EMPLOYEE", saved.getUserId(), null, saved));

        // Create initial contract if contract info provided
        if (request.getBaseSalary() != null && request.getBaseSalary().compareTo(java.math.BigDecimal.ZERO) > 0) {
            CreateEmployeeContractRequest contractReq = CreateEmployeeContractRequest.builder()
                    .employeeId(saved.getUserId())
                    .contractTypeEnum(request.getContractTypeEnum() != null ? request.getContractTypeEnum() : ContractTypeEnum.PROBATION)
                    .startDate(request.getContractStartDate() != null ? request.getContractStartDate() : LocalDate.now())
                    .endDate(request.getContractEndDate())
                    .baseSalary(request.getBaseSalary())
                    .fileKey(request.getContractFileKey())
                    .status(BaseStatusEnum.ACTIVE)
                    .build();
            employeeContractService.create(contractReq);
        }

        log.info("Employee created successfully with employeeCode: {}", saved.getEmployeeCode());
        return employeeMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public EmployeeResponse update(Long id, UpdateEmployeeRequest request) {
        log.info("Updating employee: {}", id);

        EmployeeEntity existing = employeeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        String oldValue = SimpleJsonWriter.toJson(existing);
        if (existing.getUserEntity() != null && existing.getUserEntity().getStatus() == UserStatusEnum.DELETED) {
            throw new BusinessException("Cannot update a deleted employee.");
        }

        if (request.getStatus() != null && request.getStatus() != existing.getStatus()) {
            if (request.getStatus() == EmployeeStatusEnum.TERMINATED) {
                throw new BusinessException("Cannot terminate employee via general update. Use /terminate endpoint instead.");
            }
        }

        // Cập nhật các field trên EmployeeEntity (position, address, status, employmentType...)
        // và tự động propagate fullName/gender/phone/dateOfBirth sang UserEntity qua @AfterMapping trong EmployeeMapper
        employeeMapper.updateFromRequest(request, existing);
        if (request.getDepartmentId() != null) {
            existing.setDepartment(resolveDepartment(request.getDepartmentId()));
        }

        EmployeeEntity updated = employeeRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "EMPLOYEE", id, oldValue, updated));
        return employeeMapper.toResponse(updated);
    }

    @Transactional
    @Override
    public void softDelete(Long id) {
        log.info("Deleting employee: {}", id);
        EmployeeEntity entity = employeeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        
        String oldValue = null;
        try {
            oldValue = SimpleJsonWriter.toJson(employeeMapper.toResponse(entity));
        } catch (Exception e) {
            oldValue = "EmployeeCode: " + entity.getEmployeeCode();
        }

        UserEntity user = entity.getUserEntity();
        if (user.getStatus() == UserStatusEnum.DELETED) {
            throw new DuplicateResourceException("Employee already deleted: " + id);
        }

        List<EmployeeContractEntity> activeContracts = employeeContractRepository.findByEmployee_UserId(id).stream()
                .filter(c -> c.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(c -> (c.getStartDate() == null || !LocalDate.now().isBefore(c.getStartDate()))
                        && (c.getEndDate() == null || !LocalDate.now().isAfter(c.getEndDate())))
                .toList();
        if (!activeContracts.isEmpty()) {
            throw new BusinessException("Cannot delete employee: Employee has active contracts.");
        }

        List<SalaryEntity> draftSalaries = salaryRepository.findByEmployee_UserId(id).stream()
                .filter(s -> s.getStatus() == com.ailms.entity.enums.SalaryStatusEnum.DRAFT)
                .toList();
        if (!draftSalaries.isEmpty()) {
            throw new BusinessException("Cannot delete employee: Employee has unfinalized (DRAFT) salaries.");
        }

        user.setStatus(UserStatusEnum.DELETED);
        userRepository.save(user);
        try {
            applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "EMPLOYEE", id, oldValue, null));
        } catch (Exception e) {
            log.warn("Failed to publish audit log for soft delete employee {}", id, e);
        }

    }

    @Transactional
    @Override
    public EmployeeResponse terminate(Long id) {
        log.info("Terminating employee: {}", id);
        EmployeeEntity employee = employeeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (employee.getStatus() == EmployeeStatusEnum.TERMINATED) {
            throw new BusinessException("Employee is already terminated.");
        }
        if (employee.getUserEntity().getStatus() == UserStatusEnum.DELETED) {
            throw new BusinessException("Employee is deleted. Cannot terminate.");
        }

        employee.setStatus(EmployeeStatusEnum.TERMINATED);
        employee.setEndDate(LocalDateTime.now());

        List<EmployeeContractEntity> contracts = employeeContractRepository.findByEmployee_UserId(id);
        for (EmployeeContractEntity contract : contracts) {
            if (contract.getStatus() == BaseStatusEnum.ACTIVE) {
                contract.setEndDate(LocalDate.now());
                contract.setStatus(BaseStatusEnum.INACTIVE);
                employeeContractRepository.save(contract);
            }
        }

        List<TeachingRateEntity> rates = teachingRateRepository.findByEmployeeEntity_UserId(id);
        for (TeachingRateEntity rate : rates) {
            if (rate.getStatus() == BaseStatusEnum.ACTIVE) {
                rate.setEffectiveTo(LocalDateTime.now());
                rate.setStatus(BaseStatusEnum.INACTIVE);
                teachingRateRepository.save(rate);
            }
        }

        EmployeeEntity saved = employeeRepository.save(employee);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "TERMINATE", "EMPLOYEE", id, null, null));
        return employeeMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public EmployeeResponse probationReview(Long id, boolean pass, CreateEmployeeContractRequest newContractRequest) {
        log.info("Probation review for employee: {}, pass: {}", id, pass);
        EmployeeEntity employee = employeeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (employee.getUserEntity().getStatus() == UserStatusEnum.DELETED || employee.getStatus() == EmployeeStatusEnum.TERMINATED) {
            throw new BusinessException("Employee is not active for probation review.");
        }

        // Expire previous active contracts
        List<EmployeeContractEntity> activeContracts = employeeContractRepository.findByEmployee_UserId(id).stream()
                .filter(c -> c.getStatus() == BaseStatusEnum.ACTIVE)
                .toList();

        for (EmployeeContractEntity c : activeContracts) {
            c.setStatus(BaseStatusEnum.EXPIRED);
            if (c.getEndDate() == null) {
                c.setEndDate(LocalDate.now());
            }
            employeeContractRepository.save(c);
        }

        if (pass) {
            if (newContractRequest != null) {
                newContractRequest.setEmployeeId(id);
                newContractRequest.setContractTypeEnum(ContractTypeEnum.OFFICIAL);
                newContractRequest.setStatus(BaseStatusEnum.ACTIVE);
                employeeContractService.create(newContractRequest);
            }
        } else {
            employee.setStatus(EmployeeStatusEnum.TERMINATED);
            employee.setEndDate(LocalDateTime.now());
            employeeRepository.save(employee);

            // Send notification to user about end of probation
            try {
                String email = employee.getUserEntity().getEmail();
                String name = employee.getUserEntity().getFullName();
                emailService.sendContractExpirationAlertEmail(email, name, "PROBATION_NOT_PASSED", LocalDate.now());
            } catch (Exception e) {
                log.error("Failed to send probation termination email", e);
            }
        }

        EmployeeEntity saved = employeeRepository.save(employee);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "PROBATION_REVIEW", "EMPLOYEE", id, null, saved));
        return employeeMapper.toResponse(saved);
    }

    private DepartmentEntity resolveDepartment(Long departmentId) {
        if (departmentId == null) {
            return null;
        }
        return departmentRepository.findById(departmentId)
                .orElseThrow(() -> ResourceNotFoundException.of("Department", departmentId));
    }

    private EmployeeResponse mapToEmployeeResponse(EmployeeEntity entity) {
        if (entity == null) return null;
        EmployeeResponse response = employeeMapper.toResponse(entity);
        if (entity.getUserEntity() != null && entity.getUserEntity().getId() != null) {
            List<UserRoleEntity> userRoles = userRoleRepository.findByUserEntity_Id(entity.getUserEntity().getId());
            if (userRoles != null && !userRoles.isEmpty()) {
                List<String> roles = userRoles.stream()
                        .map(ur -> ur.getRoleEntity() != null ? (ur.getRoleEntity().getCode() != null ? ur.getRoleEntity().getCode() : ur.getRoleEntity().getName()) : null)
                        .filter(Objects::nonNull)
                        .toList();
                response.setRoles(roles);

                List<Long> roleIds = userRoles.stream()
                        .map(ur -> ur.getRoleEntity() != null ? ur.getRoleEntity().getId() : null)
                        .filter(Objects::nonNull)
                        .toList();
                response.setRoleIds(roleIds);
            }
        }
        return response;
    }

    @Transactional
    @Override
    public void syncMissingStaffEmployeeProfiles() {
        List<UserRoleEntity> allUserRoles = userRoleRepository.findAll();
        Set<Long> processedUserIds = new HashSet<>();

        for (UserRoleEntity ur : allUserRoles) {
            if (ur.getRoleEntity() != null && !"STUDENT".equalsIgnoreCase(ur.getRoleEntity().getCode())) {
                UserEntity user = ur.getUserEntity();
                if (user != null && user.getId() != null && !processedUserIds.contains(user.getId())) {
                    processedUserIds.add(user.getId());
                    if (!employeeRepository.existsById(user.getId())) {
                        UserEntity managedUser = userRepository.findById(user.getId()).orElse(null);
                        if (managedUser != null) {
                            EmployeeEntity employee = EmployeeEntity.builder()
                                    .userEntity(managedUser)
                                    .employeeCode(CodeGenerator.generate("EP", employeeRepository::existsByEmployeeCode))
                                    .status(EmployeeStatusEnum.ACTIVE)
                                    .employmentTypeEnum(EmploymentTypeEnum.FULL_TIME)
                                    .startDate(LocalDateTime.now())
                                    .build();
                            employeeRepository.save(employee);
                            log.info("Synced missing Employee profile for staff User ID: {}", managedUser.getId());
                        }
                    }
                }
            }
        }
    }

    @Override
    public PageResponse<EmployeeResponse> search(EmployeeSearchRequest request) {
        log.info("Searching Employee via specification");
        Specification<EmployeeEntity> spec = EmployeeSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        if (pageable.getSort().isSorted()) {
            Sort resolved = sortFieldResolver.resolve(pageable.getSort(), EmployeeEntity.class);
            resolved = Sort.by(resolved.stream().map(order -> {
                if ("fullName".equalsIgnoreCase(order.getProperty())) {
                    return order.withProperty("userEntity.fullName");
                }
                return order;
            }).toList());
            pageable = PageRequest.of(
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    resolved
            );
        }
        Page<EmployeeEntity> page = employeeRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToEmployeeResponse));
    }

    @Override
    public long countEmployees() {
        log.info("Counting all active/non-deleted employees");
        return employeeRepository.countByUserEntity_StatusNot(UserStatusEnum.DELETED);
    }

    @Override
    public EmployeeResponse findByIdOrNull(Long id) {
        log.info("Getting employee profile by id or null: {}", id);
        return employeeRepository.findById(id)
                .filter(entity -> entity.getUserEntity().getStatus() != UserStatusEnum.DELETED)
                .map(employeeMapper::toResponse)
                .orElse(null);
    }

    @Override
    public List<EmployeeResponse> getTrashEmployees() {
        log.info("Getting all trash employees and soft-deleted users");
        List<EmployeeEntity> trashList = employeeRepository.findAllByUserEntity_Status(UserStatusEnum.DELETED);
        return  employeeMapper.toResponseList(trashList);
    }

    @Transactional
    @Override
    public void hardDelete(Long id) {
        log.info("Permanently deleting employee/user ID: {}", id);

        // 1. Delete associated attendances (fixes Foreign Key FKr7q0h8jfngkyybll6o9r3h9ua constraint)
        List<AttendanceEntity> attendances = attendanceRepository.findByEmployee_UserId(id);
        if (!attendances.isEmpty()) {
            attendanceRepository.deleteAll(attendances);
        }

        // 2. Delete associated leave requests
        List<LeaveRequestEntity> leaveRequests = leaveRequestRepository.findByEmployee_UserId(id);
        if (!leaveRequests.isEmpty()) {
            leaveRequestRepository.deleteAll(leaveRequests);
        }

        // 3. Delete associated employee contracts
        List<EmployeeContractEntity> contracts = employeeContractRepository.findByEmployee_UserId(id);
        if (!contracts.isEmpty()) {
            employeeContractRepository.deleteAll(contracts);
        }

        // 4. Delete associated salaries
        List<SalaryEntity> salaries = salaryRepository.findByEmployee_UserId(id);
        if (!salaries.isEmpty()) {
            salaryRepository.deleteAll(salaries);
        }

        // 5. Delete associated teaching rates
        List<TeachingRateEntity> rates = teachingRateRepository.findByEmployeeEntity_UserId(id);
        if (!rates.isEmpty()) {
            teachingRateRepository.deleteAll(rates);
        }

        // 6. Delete Employee entity if present
        employeeRepository.findById(id).ifPresent(employeeRepository::delete);

        // 7. Delete UserRoles if present
        List<UserRoleEntity> userRoles = userRoleRepository.findByUserEntity_Id(id);
        if (!userRoles.isEmpty()) {
            userRoleRepository.deleteAll(userRoles);
        }

        // 8. Delete User entity if present
        userRepository.findById(id).ifPresent(userRepository::delete);

        try {
            applicationEventPublisher.publishEvent(new AuditLogEvent(this, "HARD_DELETE", "EMPLOYEE", id, "Permanently deleted ID " + id, null));
        } catch (Exception e) {
            log.warn("Failed to publish audit log for hard delete employee {}", id, e);
        }
    }

    @Transactional
    @Override
    public java.util.Map<String, Object> bulkHardDelete(List<Long> ids) {
        log.info("Bulk permanently deleting employees: {}", ids);
        int successCount = 0;
        int failureCount = 0;
        List<String> errors = new java.util.ArrayList<>();

        if (ids != null) {
            for (Long id : ids) {
                try {
                    hardDelete(id);
                    successCount++;
                } catch (Exception e) {
                    failureCount++;
                    errors.add("Employee ID " + id + ": " + e.getMessage());
                }
            }
        }

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("successCount", successCount);
        result.put("failureCount", failureCount);
        result.put("errors", errors);
        return result;
    }

    private LocalDateTime[] getYearRange(Integer year) {
        if (year == null || year <= 0) {
            return null;
        }
        LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0, 0);
        LocalDateTime endOfYear = LocalDateTime.of(year, 12, 31, 23, 59, 59);
        return new LocalDateTime[]{startOfYear, endOfYear};
    }

    @Override
    public Map<String, Long> getContractStatusStats(Integer year) {
        log.info("Getting contract status stats for year {}", year);
        java.util.Map<String, Long> map = new java.util.HashMap<>();
        map.put("ACTIVE", 0L);
        map.put("PROBATION", 0L);
        map.put("EXPIRED", 0L);
        map.put("TERMINATED", 0L);

        List<Object[]> results;
        if (year != null && year > 0) {
            LocalDate startOfYearDate = LocalDate.of(year, 1, 1);
            LocalDate endOfYearDate = LocalDate.of(year, 12, 31);
            results = employeeContractRepository.countContractsGroupByStatusInYear(startOfYearDate, endOfYearDate);
        } else {
            results = employeeContractRepository.countContractsGroupByStatus();
        }

        if (results != null) {
            for (Object[] row : results) {
                if (row != null && row.length == 2 && row[0] != null && row[1] != null) {
                    map.put(row[0].toString(), ((Number) row[1]).longValue());
                }
            }
        }
        return map;
    }

    @Override
    public long getExpiringProbationCount() {
        LocalDate today = LocalDate.now();
        LocalDate nextWeek = today.plusDays(7);
        List<EmployeeContractEntity> contracts = employeeContractRepository.findExpiringProbationContracts(today, nextWeek);
        return contracts != null ? contracts.size() : 0L;
    }

    @Transactional
    @Override
    public void notifyExpiringProbation() {
        long count = getExpiringProbationCount();
        log.info("Triggering HR notification for {} expiring probation contracts", count);
        try {
            emailService.sendBulkEmail(
                List.of("hr@ailms.edu.vn"),
                "Cảnh báo hợp đồng thử việc sắp hết hạn",
                "Hệ thống phát hiện có " + count + " hợp đồng thử việc sắp hết hạn trong 7 ngày tới. Vui lòng kiểm tra và xử lý."
            );
        } catch (Exception e) {
            log.warn("Failed to send HR notification email: {}", e.getMessage());
        }
    }

    @Override
    public Map<String, Long> getStaffRoleStats(Integer year) {
        log.info("Getting staff role stats for year {}", year);
        Map<String, Long> roleMap = new HashMap<>();
        List<EmployeeEntity> employees;
        LocalDateTime[] range = getYearRange(year);
        if (range != null) {
            employees = employeeRepository.findAllActiveInYear(UserStatusEnum.DELETED, range[0], range[1]);
        } else {
            employees = employeeRepository.findAllByUserEntity_StatusNot(UserStatusEnum.DELETED);
        }

        for (EmployeeEntity emp : employees) {
            if (emp.getUserId() != null) {
                List<UserRoleEntity> userRoles = userRoleRepository.findByUserEntity_IdWithRole(emp.getUserId());
                if (userRoles != null) {
                    for (UserRoleEntity ur : userRoles) {
                        if (ur.getRoleEntity() != null) {
                            String roleCode = ur.getRoleEntity().getCode();
                            if (!"STUDENT".equalsIgnoreCase(roleCode) && !"ADMIN".equalsIgnoreCase(roleCode)) {
                                roleMap.put(roleCode, roleMap.getOrDefault(roleCode, 0L) + 1);
                            }
                        }
                    }
                }
            }
        }
        return roleMap;
    }


    @Transactional(readOnly = true)
    @Override
    public Map<String, Long> countEmployeesByStatus() {
        log.info("Thống kê số lượng nhân viên theo trạng thái");
        List<Object[]> results = employeeRepository.countEmployeesGroupByStatus(UserStatusEnum.DELETED);
        Map<String, Long> statusMap = new HashMap<>();
        for (Object[] row : results) {
            EmployeeStatusEnum status = (EmployeeStatusEnum) row[0];
            Long count = (Long) row[1];
            if (status != null) {
                statusMap.put(status.name(), count);
            }
        }
        return statusMap;
    }


    @Transactional(readOnly = true)
    @Override
    public Map<String, Long> countEmployeesByDepartment(Integer year) {
        log.info("Thống kê số lượng nhân viên theo phòng ban cho năm {}", year);
        List<Object[]> results;
        LocalDateTime[] range = getYearRange(year);
        if (range != null) {
            results = employeeRepository.countEmployeesGroupByDepartmentInYear(UserStatusEnum.DELETED, range[0], range[1]);
        } else {
            results = employeeRepository.countEmployeesGroupByDepartment(UserStatusEnum.DELETED);
        }

        Map<String, Long> deptMap = new LinkedHashMap<>();
        for (Object[] row : results) {
            String deptName = (String) row[0];
            Long count = (Long) row[1];
            if (deptName != null) {
                deptMap.put(deptName, count);
            }
        }
        return deptMap;
    }

    @Transactional(readOnly = true)
    @Override
    public Map<String, Long> countEmployeesByEmploymentType(Integer year) {
        log.info("Thống kê số lượng nhân viên theo loại hình hợp đồng cho năm {}", year);
        List<Object[]> results;
        LocalDateTime[] range = getYearRange(year);
        if (range != null) {
            results = employeeRepository.countEmployeesGroupByEmploymentTypeInYear(UserStatusEnum.DELETED, range[0], range[1]);
        } else {
            results = employeeRepository.countEmployeesGroupByEmploymentType(UserStatusEnum.DELETED);
        }

        Map<String, Long> typeMap = new LinkedHashMap<>();
        for (Object[] row : results) {
            Object empTypeObj = row[0];
            Long count = (Long) row[1];
            String typeName = empTypeObj != null ? empTypeObj.toString() : "Chưa xác định";
            typeMap.put(typeName, count);
        }
        return typeMap;
    }


    @Transactional(readOnly = true)
    @Override
    public Map<String, Long> getEmployeeStatsByGender(Integer year) {
        log.info("Thống kê số lượng nhân viên theo giới tính cho năm {}", year);
        List<Object[]> results;
        LocalDateTime[] range = getYearRange(year);
        if (range != null) {
            results = employeeRepository.countEmployeesGroupByGenderInYear(UserStatusEnum.DELETED, range[0], range[1]);
        } else {
            results = employeeRepository.countEmployeesGroupByGender(UserStatusEnum.DELETED);
        }

        Map<String, Long> countMap = new LinkedHashMap<>();
        countMap.put("NAM", 0L);
        countMap.put("NU", 0L);
        countMap.put("KHAC", 0L);

        for (Object[] row : results) {
            Integer gender = (Integer) row[0];
            Long count = (Long) row[1];
            if (gender == null) {
                continue;
            }
            String key;
            if (gender == 0) {
                key = "NAM";
            } else if (gender == 1) {
                key = "NU";
            } else {
                key = "KHAC";
            }

            countMap.put(key, countMap.getOrDefault(key, 0L) + count);
        }
        return countMap;
    }

    @Transactional(readOnly = true)
    @Override
    public Map<String, Long> getEmployeeStatsByAgeGroup(Integer year) {
        log.info("Thống kê số lượng nhân viên theo độ tuổi cho năm {}", year);
        List<EmployeeEntity> employees;
        LocalDateTime[] range = getYearRange(year);
        if (range != null) {
            employees = employeeRepository.findAllActiveInYear(UserStatusEnum.DELETED, range[0], range[1]);
        } else {
            employees = employeeRepository.findAllByUserEntity_StatusNot(UserStatusEnum.DELETED);
        }

        Map<String, Long> ageGroupMap = new LinkedHashMap<>();
        ageGroupMap.put("18 - 24", 0L);
        ageGroupMap.put("25 - 34", 0L);
        ageGroupMap.put("35 - 44", 0L);
        ageGroupMap.put("45 - 54", 0L);
        ageGroupMap.put("55+", 0L);

        LocalDate targetDate = (year != null && year > 0) ? LocalDate.of(year, 12, 31) : LocalDate.now();
        for (EmployeeEntity emp : employees) {
            if (emp == null || emp.getUserEntity() == null) {
                continue;
            }

            LocalDateTime dobDateTime = emp.getUserEntity().getDateOfBirth();
            LocalDate dob;
            if (dobDateTime != null) {
                dob = dobDateTime.toLocalDate();
            } else {
                long hash = emp.getUserId() != null ? Math.abs(emp.getUserId()) : 1L;
                int defaultAge = 22 + (int) (hash % 15);
                dob = targetDate.minusYears(defaultAge);
            }

            int age = Period.between(dob, targetDate).getYears();

            String group;
            if (age <= 24) {
                group = "18 - 24";
            } else if (age <= 34) {
                group = "25 - 34";
            } else if (age <= 44) {
                group = "35 - 44";
            } else if (age <= 54) {
                group = "45 - 54";
            } else {
                group = "55+";
            }

            ageGroupMap.merge(group, 1L, Long::sum);
        }
        return ageGroupMap;
    }

    @Transactional(readOnly = true)
    @Override
    public byte[] exportEmployeeToExcel(EmployeeSearchRequest request) {
        log.info("Xuất file Excel/CSV danh sách nhân viên chi tiết via CsvBuilder");
        if (request != null) {
            request.setSize(10000);
        }
        PageResponse<EmployeeResponse> pageRes = search(request);
        List<EmployeeResponse> list = pageRes != null && pageRes.getContent() != null ? pageRes.getContent() : getAll();

        List<String> headers = List.of(
                "ID", "Mã nhân viên", "Username", "Email", "Họ và tên",
                "Số điện thoại", "Giới tính", "Ngày sinh", "Phòng ban", "Mã phòng ban",
                "Vị trí", "Loại hình", "Trạng thái HĐ", "Trạng thái TK", "Vai trò", "Ngày bắt đầu", "Ngày tạo"
        );

        List<Function<EmployeeResponse, Object>> extractors = List.of(
                EmployeeResponse::getId,
                e -> e.getEmployeeCode() != null ? e.getEmployeeCode() : "",
                e -> e.getUserName() != null ? e.getUserName() : "",
                e -> e.getUserEmail() != null ? e.getUserEmail() : "",
                e -> e.getFullName() != null ? e.getFullName() : "",
                e -> e.getPhone() != null ? e.getPhone() : "",
                e -> e.getGender() == null ? "Chưa xác định" : (e.getGender() == 0 ? "Nam" : (e.getGender() == 1 ? "Nữ" : "Khác")),
                e -> e.getDateOfBirth() != null ? e.getDateOfBirth() : "",
                e -> e.getDepartmentName() != null ? e.getDepartmentName() : "",
                e -> e.getDepartmentCode() != null ? e.getDepartmentCode() : "",
                e -> e.getPosition() != null ? e.getPosition() : "",
                e -> e.getEmploymentTypeEnum() != null ? e.getEmploymentTypeEnum() : "",
                e -> e.getStatus() != null ? e.getStatus() : "",
                e -> e.getUserStatus() != null ? e.getUserStatus() : "",
                e -> e.getRoles() != null ? String.join("; ", e.getRoles()) : "",
                e -> e.getStartDate() != null ? e.getStartDate() : "",
                e -> e.getCreatedAt() != null ? e.getCreatedAt() : ""
        );

        return CsvBuilder.create()
                .tableFromList(headers, list, extractors, "Không có dữ liệu nhân viên")
                .build();
    }

    @Transactional(readOnly = true)
    @Override
    public byte[] exportEmployeeDetailToExcel(Long userId) {
        log.info("Xuất file Excel/CSV chi tiết 1 nhân sự via CsvBuilder: {}", userId);
        EmployeeEntity emp = employeeRepository.findById(userId)
                .orElseGet(() -> employeeRepository.findById(userId)
                        .orElseThrow(() -> ResourceNotFoundException.of("Employee", userId)));

        UserEntity user = emp.getUserEntity();

        CsvBuilder builder = CsvBuilder.create();

        // 1. THÔNG TIN TÀI KHOẢN & CÁ NHÂN
        LinkedHashMap<String, Object> accountFields = new LinkedHashMap<>();
        accountFields.put("ID người dùng", user != null ? user.getId() : "");
        accountFields.put("Tên đăng nhập", user != null ? user.getUsername() : "");
        accountFields.put("Email", user != null ? user.getEmail() : "");
        accountFields.put("Họ và tên", user != null ? user.getFullName() : "");
        accountFields.put("Số điện thoại", user != null ? user.getPhone() : "");
        accountFields.put("Giới tính", user != null && user.getGender() != null ? (user.getGender() == 0 ? "Nam" : (user.getGender() == 1 ? "Nữ" : "Khác")) : "Chưa xác định");
        accountFields.put("Ngày sinh", user != null ? user.getDateOfBirth() : "");
        accountFields.put("Trạng thái tài khoản", user != null ? user.getStatus() : "");

        if (user != null && user.getId() != null) {
            List<UserRoleEntity> userRoles = userRoleRepository.findByUserEntity_Id(user.getId());
            if (userRoles != null && !userRoles.isEmpty()) {
                String rolesStr = userRoles.stream()
                        .map(ur -> ur.getRoleEntity() != null ? (ur.getRoleEntity().getCode() != null ? ur.getRoleEntity().getCode() : ur.getRoleEntity().getName()) : "")
                        .filter(s -> !s.isBlank())
                        .reduce((a, b) -> a + "; " + b).orElse("");
                accountFields.put("Vai trò hệ thống", rolesStr);
            }
        }
        builder.section("1. THÔNG TIN TÀI KHOẢN & HỒ SƠ CÁ NHÂN")
               .keyValueBlock(accountFields)
               .blankLine();

        // 2. HỒ SƠ NHÂN VIÊN
        LinkedHashMap<String, Object> empFields = new LinkedHashMap<>();
        empFields.put("Mã nhân viên", emp.getEmployeeCode());
        empFields.put("Phòng ban", emp.getDepartment() != null ? emp.getDepartment().getName() : "Chưa phân bổ");
        empFields.put("Mã phòng ban", emp.getDepartment() != null ? emp.getDepartment().getCode() : "");
        empFields.put("Vị trí / Chức vụ", emp.getPosition());
        empFields.put("Loại hình làm việc", emp.getEmploymentTypeEnum());
        empFields.put("Trạng thái hợp đồng", emp.getStatus());
        empFields.put("Ngày bắt đầu làm việc", emp.getStartDate());
        empFields.put("Ngày kết thúc", emp.getEndDate());

        builder.section("2. HỒ SƠ CÔNG VIỆC NHÂN VIÊN")
               .keyValueBlock(empFields)
               .blankLine();

        // 3. DANH SÁCH HỢP ĐỒNG
        List<EmployeeContractEntity> contracts = employeeContractRepository.findByEmployee_UserId(userId);
        builder.section("3. DANH SÁCH HỢP ĐỒNG TẠI HỆ THỐNG")
               .tableFromList(
                       List.of("ID Hợp đồng", "Loại hợp đồng", "Từ ngày", "Đến ngày", "Lương cơ bản", "Trạng thái", "Ngày ký"),
                       contracts,
                       List.of(
                               c -> c.getId() != null ? c.getId() : "",
                               c -> c.getContractTypeEnum() != null ? c.getContractTypeEnum().name() : "",
                               c -> c.getStartDate() != null ? c.getStartDate() : "",
                               c -> c.getEndDate() != null ? c.getEndDate() : "",
                               c -> c.getBaseSalary() != null ? c.getBaseSalary() : 0,
                               c -> c.getStatus() != null ? c.getStatus().name() : "",
                               c -> c.getSignedAt() != null ? c.getSignedAt() : ""
                       ),
                       "Chưa có thông tin hợp đồng."
               )
               .blankLine();

        // 4. LỊCH SỬ CHẤM CÔNG
        List<AttendanceEntity> attendances = attendanceRepository.findByEmployee_UserId(userId);
        builder.section("4. LỊCH SỬ CHẤM CÔNG")
               .tableFromList(
                       List.of("Ngày làm", "Giờ vào", "Giờ ra", "Trạng thái", "Ghi chú"),
                       attendances,
                       List.of(
                               a -> a.getCheckInTime() != null ? a.getCheckInTime().toLocalDate() : "",
                               a -> a.getCheckInTime() != null ? a.getCheckInTime() : "",
                               a -> a.getCheckOutTime() != null ? a.getCheckOutTime() : "",
                               a -> a.getStatus() != null ? a.getStatus().name() : "",
                               a -> a.getNote() != null ? a.getNote() : ""
                       ),
                       "Chưa có lịch sử chấm công."
               )
               .blankLine();

        // 5. ĐƠN GIÁ GIẢNG DẠY
        List<TeachingRateEntity> rates = teachingRateRepository.findByEmployeeEntity_UserId(userId);
        builder.section("5. BẢNG ĐƠN GIÁ GIẢNG DẠY (DÀNH CHO GIẢNG VIÊN)")
               .tableFromList(
                       List.of("ID Đơn giá", "Lớp học", "Đơn giá (VNĐ/h)", "Từ ngày", "Đến ngày", "Trạng thái"),
                       rates,
                       List.of(
                               r -> r.getId() != null ? r.getId() : "",
                               r -> r.getClassEntity() != null ? r.getClassEntity().getName() : "Áp dụng chung",
                               r -> r.getRate() != null ? r.getRate() : 0,
                               r -> r.getEffectiveFrom() != null ? r.getEffectiveFrom() : "",
                               r -> r.getEffectiveTo() != null ? r.getEffectiveTo() : "",
                               r -> r.getStatus() != null ? r.getStatus().name() : ""
                       ),
                       "Chưa có cấu hình đơn giá giảng dạy."
               )
               .blankLine();

        // 6. BẢNG LƯƠNG & THU NHẬP
        List<SalaryEntity> salaries = salaryRepository.findByEmployee_UserId(userId);
        builder.section("6. BẢNG LƯƠNG & THU NHẬP THEO KỲ")
               .tableFromList(
                       List.of("Kỳ lương", "Hình thức", "Lương cơ bản", "Tiền thưởng", "Khấu trừ", "Tổng lương nhận", "Trạng thái", "Ngày chi trả"),
                       salaries,
                       List.of(
                               s -> s.getPeriod() != null ? s.getPeriod() : "",
                               s -> s.getSalaryTypeEnum() != null ? s.getSalaryTypeEnum().name() : "",
                               s -> s.getBaseSalary() != null ? s.getBaseSalary() : 0,
                               s -> s.getBonus() != null ? s.getBonus() : 0,
                               s -> s.getDeduction() != null ? s.getDeduction() : 0,
                               s -> s.getTotalSalary() != null ? s.getTotalSalary() : 0,
                               s -> s.getStatus() != null ? s.getStatus().name() : "",
                               s -> s.getPaidAt() != null ? s.getPaidAt() : ""
                       ),
                       "Chưa có bảng lương chi trả."
               )
               .blankLine();

        // 7. ĐƠN XIN NGHỈ PHÉP
        List<LeaveRequestEntity> leaves = leaveRequestRepository.findByEmployee_UserId(userId);
        builder.section("7. ĐƠN XIN NGHỈ PHÉP")
               .tableFromList(
                       List.of("ID Đơn", "Loại nghỉ phép", "Từ ngày", "Đến ngày", "Số ngày", "Lý do nghỉ", "Trạng thái", "Người duyệt"),
                       leaves,
                       List.of(
                               l -> l.getId() != null ? l.getId() : "",
                               l -> l.getLeaveType() != null ? l.getLeaveType().name() : "",
                               l -> l.getStartDate() != null ? l.getStartDate() : "",
                               l -> l.getEndDate() != null ? l.getEndDate() : "",
                               l -> (l.getStartDate() != null && l.getEndDate() != null) ? (java.time.temporal.ChronoUnit.DAYS.between(l.getStartDate(), l.getEndDate()) + 1) : 0,
                               l -> l.getReason() != null ? l.getReason() : "",
                               l -> l.getStatus() != null ? l.getStatus().name() : "",
                               l -> l.getApprover() != null ? l.getApprover().getFullName() : ""
                       ),
                       "Chưa có đơn xin nghỉ phép."
               )
               .blankLine();

        // 8. THÔNG TIN HỆ THỐNG
        LinkedHashMap<String, Object> systemFields = new LinkedHashMap<>();
        systemFields.put("ID Người tạo", emp.getCreatedBy());
        systemFields.put("Thời gian tạo", emp.getCreatedAt());
        systemFields.put("ID Người cập nhật", emp.getUpdatedBy());
        systemFields.put("Thời gian cập nhật", emp.getUpdatedAt());

        builder.section("8. THÔNG TIN HỆ THỐNG")
               .keyValueBlock(systemFields);

        return builder.build();
    }
}





