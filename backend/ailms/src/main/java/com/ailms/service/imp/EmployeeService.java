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
    private final SortFieldResolver sortFieldResolver;
    private final IEmailService emailService;
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
                throw new BusinessException("Email is required to create a new user and employee");
            }
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException("Email already exists: " + request.getEmail());
            }

            String tempPassword = request.getPassword() != null && !request.getPassword().isBlank()
                    ? request.getPassword()
                    : UUID.randomUUID().toString().substring(0, 8);

            user = UserEntity.builder()
                    .username(request.getEmail())
                    .email(request.getEmail())
                    .passwordHash(passwordEncoder.encode(tempPassword))
                    .fullName(request.getFullName() != null ? request.getFullName() : request.getEmail())
                    .status(UserStatusEnum.ACTIVE)
                    .build();
            user = userRepository.save(user);

            // Assign Role
            String roleCode = request.getRoleCode() != null ? request.getRoleCode() : "EMPLOYEE";
            RoleEntity role = roleRepository.findByCode(roleCode)
                    .orElseGet(() -> roleRepository.findByCode("EMPLOYEE")
                            .orElseThrow(() -> ResourceNotFoundException.of("Role", roleCode)));

            UserRoleEntity userRole = UserRoleEntity.builder()
                    .userEntity(user)
                    .roleEntity(role)
                    .build();
            userRoleRepository.save(userRole);

            // Send set password / welcome email async
            final String recipientEmail = user.getEmail();
            final String token = UUID.randomUUID().toString();
            try {
                emailService.sendSetPasswordEmail(recipientEmail, token);
            } catch (Exception e) {
                log.error("Failed to send welcome set-password email to {}", recipientEmail, e);
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
        String oldValue = SimpleJsonWriter.toJson(entity);
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
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "EMPLOYEE", id, oldValue, null));
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
}


