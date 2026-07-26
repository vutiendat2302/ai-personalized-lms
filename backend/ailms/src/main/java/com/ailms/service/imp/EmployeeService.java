package com.ailms.service.imp;

import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.common.util.CodeGenerator;
import com.ailms.entity.*;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.entity.enums.EmployeeStatusEnum;
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
import com.ailms.common.util.SortFieldResolver;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import com.ailms.repository.specification.EmployeeSpecification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

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
        return employeeMapper.toResponseList(employeeRepository.findAllByStatusNot(EmployeeStatusEnum.DELETE));
    }

    @Override
    public EmployeeResponse getById(Long id) {
        log.info("Getting employee by id: {}", id);
        EmployeeEntity entity = employeeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        if (entity.getStatus() == EmployeeStatusEnum.DELETE) {
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
        if (existing.getStatus() == EmployeeStatusEnum.DELETE) {
            throw new BusinessException("Cannot update a deleted employee.");
        }

        if (request.getStatus() != null && request.getStatus() != existing.getStatus()) {
            if (request.getStatus() == EmployeeStatusEnum.TERMINATED) {
                throw new BusinessException("Cannot terminate employee via general update. Use /terminate endpoint instead.");
            }
            if (request.getStatus() == EmployeeStatusEnum.DELETE) {
                throw new BusinessException("Cannot delete employee via general update. Use delete endpoint instead.");
            }
        }

        if (request.getEmployeeCode() != null && !existing.getEmployeeCode().equals(request.getEmployeeCode()) &&
                employeeRepository.existsByEmployeeCode(request.getEmployeeCode())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "employeeCode", request.getEmployeeCode());
        }

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

        if (entity.getStatus() == EmployeeStatusEnum.DELETE) {
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

        entity.setStatus(EmployeeStatusEnum.DELETE);
        try {
            applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "EMPLOYEE", id, oldValue, null));
        } catch (Exception e) {
            log.warn("Failed to publish audit log for soft delete employee {}", id, e);
        }
        employeeRepository.save(entity);
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
        if (employee.getStatus() == EmployeeStatusEnum.DELETE) {
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

        if (employee.getStatus() == EmployeeStatusEnum.DELETE || employee.getStatus() == EmployeeStatusEnum.TERMINATED) {
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

    @Override
    public PageResponse<EmployeeResponse> search(EmployeeSearchRequest request) {
        log.info("Searching Employee via specification");
        Specification<EmployeeEntity> spec = EmployeeSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        if (pageable.getSort().isSorted()) {
            pageable = PageRequest.of(
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    sortFieldResolver.resolve(pageable.getSort(), EmployeeEntity.class)
            );
        }
        Page<EmployeeEntity> page = employeeRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(employeeMapper::toResponse));
    }

    @Override
    public long countEmployees() {
        log.info("Counting all active/non-deleted employees");
        return employeeRepository.countByStatusNot(EmployeeStatusEnum.DELETE);
    }

    @Override
    public EmployeeResponse findByIdOrNull(Long id) {
        log.info("Getting employee profile by id or null: {}", id);
        return employeeRepository.findById(id)
                .filter(entity -> entity.getStatus() != EmployeeStatusEnum.DELETE)
                .map(employeeMapper::toResponse)
                .orElse(null);
    }

    @Override
    public List<EmployeeResponse> getTrashEmployees() {
        log.info("Getting all trash employees and soft-deleted users");
        List<EmployeeEntity> trashList = employeeRepository.findByStatus(EmployeeStatusEnum.DELETE);
        List<EmployeeResponse> responses = employeeMapper.toResponseList(trashList);

        // Also include soft-deleted users from UserRepository
        List<UserEntity> deletedUsers = userRepository.findByStatus(UserStatusEnum.DELETED);
        java.util.Set<Long> existingIds = responses.stream()
                .map(EmployeeResponse::getId)
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());

        for (UserEntity u : deletedUsers) {
            if (!existingIds.contains(u.getId())) {
                EmployeeResponse synthetic = EmployeeResponse.builder()
                        .id(u.getId())
                        .userId(u.getId())
                        .userName(u.getUsername())
                        .userEmail(u.getEmail())
                        .fullName(u.getFullName() != null ? u.getFullName() : u.getUsername())
                        .employeeCode("USER-" + u.getId())
                        .position("Tài khoản hệ thống")
                        .status(EmployeeStatusEnum.DELETE)
                        .createdAt(u.getCreatedAt())
                        .updatedAt(u.getUpdatedAt())
                        .build();
                responses.add(synthetic);
            }
        }

        return responses;
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
}


