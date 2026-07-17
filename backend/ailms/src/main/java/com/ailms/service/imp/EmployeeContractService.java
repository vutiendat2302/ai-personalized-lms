package com.ailms.service.imp;
import com.ailms.repository.specification.EmployeeContractSpecification;
import com.ailms.request.CreateEmployeeContractRequest;
import com.ailms.request.EmployeeContractSearchRequest;
import com.ailms.request.UpdateEmployeeContractRequest;
import com.ailms.service.IEmployeeContractService;


import com.ailms.entity.EmployeeContractEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.EmployeeContractMapper;
import com.ailms.repository.EmployeeContractRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.FileMetadataRepository;
import com.ailms.response.EmployeeContractResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDate;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.exception.BusinessException;
import com.ailms.repository.SalaryRepository;
import com.ailms.entity.SalaryEntity;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class EmployeeContractService implements IEmployeeContractService {

    private final EmployeeContractRepository employeeContractRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeContractMapper employeeContractMapper;
    private final FileMetadataRepository fileMetadataRepository;
    private final SalaryRepository salaryRepository;
    private final com.ailms.service.IApprovalRequestService approvalRequestService;
    private final com.ailms.service.IEmailService emailService;

    private static final String RESOURCE_NAME = "EmployeeContract";

    public List<EmployeeContractResponse> getAll() {
        log.info("Getting all employee contracts");
        return employeeContractMapper.toResponseList(employeeContractRepository.findAll());
    }

    public EmployeeContractResponse getById(Long id) {
        log.info("Getting contract by id: {}", id);
        EmployeeContractEntity entity = employeeContractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        verifyContractAccess(entity);
        return employeeContractMapper.toResponse(entity);
    }

    public List<EmployeeContractResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting contracts for employee: {}", employeeId);
        verifyEmployeeAccess(employeeId);
        return employeeContractMapper.toResponseList(employeeContractRepository.findByEmployee_UserId(employeeId));
    }

    @Transactional
    public EmployeeContractResponse create(CreateEmployeeContractRequest request) {
        log.info("Creating contract for employee: {}", request.getEmployeeId());

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        if (employee.getStatus() == EmployeeStatusEnum.DELETE) {
            throw new BusinessException("Employee is deleted. Cannot create contract.");
        }

        if (request.getBaseSalary() == null || request.getBaseSalary().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Base salary must be greater than 0.");
        }

        if (request.getStartDate() == null) {
            throw new BusinessException("Start date is required.");
        }

        if (request.getEndDate() != null && !request.getEndDate().isAfter(request.getStartDate())) {
            throw new BusinessException("End date must be after start date.");
        }

        BaseStatusEnum status = request.getStatus() != null ? request.getStatus() : BaseStatusEnum.ACTIVE;
        if (status == BaseStatusEnum.ACTIVE) {
            validateAndManageContractOverlap(request.getEmployeeId(), request.getStartDate(), request.getEndDate(), null);
        }

        EmployeeContractEntity entity = employeeContractMapper.toEntity(request);
        entity.setEmployee(employee);
        entity.setStatus(status);

        if (request.getFileKey() != null) {
            com.ailms.entity.FileMetadataEntity fileMetadata = fileMetadataRepository.findByFileKey(request.getFileKey())
                    .orElseThrow(() -> new BusinessException("File not found or not uploaded successfully: " + request.getFileKey()));
            entity.setFileMetadata(fileMetadata);
        }

        EmployeeContractEntity saved = employeeContractRepository.save(entity);

        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                String toEmail = employee.getUserEntity().getEmail();
                String fullName = employee.getUserEntity().getFullName();
                String contractType = saved.getContractTypeEnum() != null ? saved.getContractTypeEnum().name() : "N/A";
                String fileKey = saved.getFileMetadata() != null ? saved.getFileMetadata().getFileKey() : null;
                String downloadUrl = fileKey != null ? "/api/v1/files/download?fileKey=" + fileKey : "";

                emailService.sendContractNotificationEmail(toEmail, fullName, contractType, downloadUrl);
            } catch (Exception e) {
                log.error("Async sending contract email failed", e);
            }
        });

        return employeeContractMapper.toResponse(saved);
    }

    @Transactional
    public EmployeeContractResponse update(Long id, UpdateEmployeeContractRequest request) {
        log.info("Updating contract: {}", id);

        if (approvalRequestService.isLocked("CONTRACT", id)) {
            throw new BusinessException("Hợp đồng đang trong quá trình phê duyệt, không thể chỉnh sửa.");
        }

        EmployeeContractEntity existing = employeeContractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (request.getBaseSalary() != null && request.getBaseSalary().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Base salary must be greater than 0.");
        }

        LocalDate newStart = request.getStartDate() != null ? request.getStartDate() : existing.getStartDate();
        LocalDate newEnd = request.getEndDate() != null ? request.getEndDate() : existing.getEndDate();

        if (newEnd != null && !newEnd.isAfter(newStart)) {
            throw new BusinessException("End date must be after start date.");
        }

        if (existing.getStatus() == BaseStatusEnum.ACTIVE && request.getStatus() != null && request.getStatus() != BaseStatusEnum.ACTIVE) {
            if (newEnd == null) {
                throw new BusinessException("End date is required when terminating/deactivating the contract.");
            }
        }

        BaseStatusEnum status = request.getStatus() != null ? request.getStatus() : existing.getStatus();
        if (status == BaseStatusEnum.ACTIVE) {
            validateAndManageContractOverlap(existing.getEmployee().getUserId(), newStart, newEnd, existing.getId());
        }

        employeeContractMapper.updateFromRequest(request, existing);

        EmployeeContractEntity updated = employeeContractRepository.save(existing);
        return employeeContractMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting contract: {}", id);

        if (approvalRequestService.isLocked("CONTRACT", id)) {
            throw new BusinessException("Hợp đồng đang trong quá trình phê duyệt, không thể xóa.");
        }

        EmployeeContractEntity contract = employeeContractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        List<SalaryEntity> salaries = salaryRepository.findByEmployee_UserId(contract.getEmployee().getUserId());
        for (SalaryEntity salary : salaries) {
            boolean overlaps = !salary.getPeriod().atEndOfMonth().isBefore(contract.getStartDate())
                    && (contract.getEndDate() == null || !salary.getPeriod().atDay(1).isAfter(contract.getEndDate()));
            if (overlaps) {
                throw new BusinessException("Hợp đồng đã được sử dụng để tính lương cho kỳ " + salary.getPeriod() + ". Không thể xóa.");
            }
        }

        employeeContractRepository.delete(contract);
    }

    @Override
    public PageResponse<EmployeeContractResponse> search(EmployeeContractSearchRequest request) {
        log.info("Searching EmployeeContract via specification");
        Specification<EmployeeContractEntity> spec = EmployeeContractSpecification.filterAndSearch(request);
        spec = spec.and(getContractSecuritySpecification());
        Pageable pageable = request.toPageable();
        Page<EmployeeContractEntity> page = employeeContractRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(employeeContractMapper::toResponse));
    }

    private void validateAndManageContractOverlap(Long employeeId, LocalDate newStart, LocalDate newEnd, Long currentContractId) {
        List<EmployeeContractEntity> activeContracts = employeeContractRepository.findByEmployee_UserId(employeeId).stream()
                .filter(c -> c.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(c -> currentContractId == null || !c.getId().equals(currentContractId))
                .toList();

        for (EmployeeContractEntity c : activeContracts) {
            boolean overlaps = (c.getEndDate() == null || !newStart.isAfter(c.getEndDate()))
                    && (newEnd == null || !newEnd.isBefore(c.getStartDate()));

            if (overlaps) {
                if (c.getStartDate().isBefore(newStart)) {
                    // Auto close the old contract
                    c.setEndDate(newStart.minusDays(1));
                    c.setStatus(BaseStatusEnum.INACTIVE);
                    employeeContractRepository.save(c);
                } else {
                    throw new BusinessException("Nhân viên đã có hợp đồng hiệu lực trong khoảng thời gian này");
                }
            }
        }
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

        if (roles.contains("ROLE_HR") || roles.contains("ROLE_PAYROLL")) {
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

    private void verifyContractAccess(EmployeeContractEntity contract) {
        verifyEmployeeAccess(contract.getEmployee().getUserId());
    }

    private Specification<EmployeeContractEntity> getContractSecuritySpecification() {
        Long currentUserId = getCurrentUserId();
        List<String> roles = getCurrentUserRoles();

        if (roles.contains("ROLE_HR") || roles.contains("ROLE_PAYROLL")) {
            return (root, query, cb) -> cb.conjunction();
        }

        if (roles.contains("ROLE_ADMIN")) {
            return (root, query, cb) -> cb.disjunction();
        }

        Specification<EmployeeContractEntity> spec = (root, query, cb) -> cb.disjunction();

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
