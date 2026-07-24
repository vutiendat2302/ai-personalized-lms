package com.ailms.service.imp;

import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.entity.EmployeeContractEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.LeaveRequestEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.LeaveStatusEnum;
import com.ailms.entity.enums.LeaveTypeEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.LeaveRequestMapper;
import com.ailms.repository.EmployeeContractRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.LeaveRequestRepository;
import com.ailms.repository.UserRepository;
import com.ailms.repository.specification.LeaveRequestSpecification;
import com.ailms.request.CreateLeaveRequest;
import com.ailms.request.LeaveRequestSearchRequest;
import com.ailms.request.UpdateLeaveRequest;
import com.ailms.response.LeaveRequestResponse;
import com.ailms.response.PageResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IEmailService;
import com.ailms.service.ILeaveRequestService;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LeaveRequestService implements ILeaveRequestService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeContractRepository employeeContractRepository;
    private final UserRepository userRepository;
    private final LeaveRequestMapper leaveRequestMapper;
    private final IEmailService emailService;
    private final ApplicationEventPublisher applicationEventPublisher;

    private static final String RESOURCE_NAME = "LeaveRequest";
    private static final int MAX_ANNUAL_LEAVE_DAYS = 12;

    @Override
    public List<LeaveRequestResponse> getAll() {
        log.info("Getting all leave requests");
        return leaveRequestMapper.toResponseList(leaveRequestRepository.findAll());
    }

    @Override
    public LeaveRequestResponse getById(Long id) {
        log.info("Getting leave request by id: {}", id);
        LeaveRequestEntity entity = leaveRequestRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        verifyLeaveAccess(entity);
        return leaveRequestMapper.toResponse(entity);
    }

    @Override
    public List<LeaveRequestResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting leave requests for employee: {}", employeeId);
        verifyEmployeeAccess(employeeId);
        return leaveRequestMapper.toResponseList(leaveRequestRepository.findByEmployee_UserId(employeeId));
    }

    @Transactional
    @Override
    public LeaveRequestResponse create(CreateLeaveRequest request) {
        log.info("Creating leave request for employee: {}", request.getEmployeeId());

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        if (employee.getStatus() == EmployeeStatusEnum.DELETE || employee.getStatus() == EmployeeStatusEnum.TERMINATED) {
            throw new BusinessException("Employee is inactive/deleted/terminated. Cannot request leave.");
        }

        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new BusinessException("Start date and end date are required.");
        }

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BusinessException("End date cannot be before start date.");
        }

        // 5.8: Check date range is within active contract period
        List<EmployeeContractEntity> activeContracts = employeeContractRepository.findByEmployee_UserId(request.getEmployeeId()).stream()
                .filter(c -> c.getStatus() == BaseStatusEnum.ACTIVE)
                .filter(c -> !c.getStartDate().isAfter(request.getStartDate()))
                .filter(c -> c.getEndDate() == null || !c.getEndDate().isBefore(request.getEndDate()))
                .toList();

        if (activeContracts.isEmpty()) {
            throw new BusinessException("Thời gian nghỉ phép phải nằm trong khoảng hợp đồng đang có hiệu lực.");
        }

        // 5.8: Calculate remaining leave days in year
        LocalDate startOfYear = LocalDate.of(request.getStartDate().getYear(), 1, 1);
        LocalDate endOfYear = LocalDate.of(request.getStartDate().getYear(), 12, 31);
        List<LeaveRequestEntity> existingApproved = leaveRequestRepository.findApprovedLeavesInYear(request.getEmployeeId(), LeaveStatusEnum.APPROVED, startOfYear, endOfYear);

        long usedDays = 0;
        for (LeaveRequestEntity leave : existingApproved) {
            usedDays += ChronoUnit.DAYS.between(leave.getStartDate(), leave.getEndDate()) + 1;
        }

        long requestedDays = ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate()) + 1;
        LeaveStatusEnum initialStatus = LeaveStatusEnum.PENDING;

        if (request.getLeaveType() == LeaveTypeEnum.ANNUAL && (usedDays + requestedDays > MAX_ANNUAL_LEAVE_DAYS)) {
            initialStatus = LeaveStatusEnum.UNPAID;
        }

        LeaveRequestEntity entity = leaveRequestMapper.toEntity(request);
        entity.setEmployee(employee);
        entity.setStatus(initialStatus);

        LeaveRequestEntity saved = leaveRequestRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "LEAVE_REQUEST", saved.getId(), null, saved));
        return leaveRequestMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public LeaveRequestResponse update(Long id, UpdateLeaveRequest request) {
        log.info("Updating leave request: {}", id);

        LeaveRequestEntity existing = leaveRequestRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        String oldValue = SimpleJsonWriter.toJson(existing);

        if (existing.getStatus() != LeaveStatusEnum.PENDING && existing.getStatus() != LeaveStatusEnum.UNPAID) {
            throw new BusinessException("Chỉ được sửa đơn nghỉ phép khi trạng thái đang là PENDING hoặc UNPAID.");
        }

        leaveRequestMapper.updateFromRequest(request, existing);

        LeaveRequestEntity updated = leaveRequestRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "LEAVE_REQUEST", id, oldValue, updated));
        return leaveRequestMapper.toResponse(updated);
    }

    @Transactional
    @Override
    public LeaveRequestResponse approve(Long id, boolean approve, String rejectionReason) {
        log.info("Approving/Rejecting leave request: {}, approve: {}", id, approve);

        LeaveRequestEntity existing = leaveRequestRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        Long currentUserId = getCurrentUserId();
        UserEntity approver = userRepository.findById(currentUserId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", currentUserId));

        if (existing.getStatus() != LeaveStatusEnum.PENDING && existing.getStatus() != LeaveStatusEnum.UNPAID) {
            throw new BusinessException("Đơn nghỉ phép không ở trạng thái chờ duyệt.");
        }

        if (approve) {
            existing.setStatus(LeaveStatusEnum.APPROVED);
        } else {
            existing.setStatus(LeaveStatusEnum.REJECTED);
            existing.setRejectionReason(rejectionReason);
        }
        existing.setApprover(approver);
        existing.setApprovedAt(LocalDateTime.now());

        LeaveRequestEntity saved = leaveRequestRepository.save(existing);

        // Send email response to user
        try {
            String toEmail = saved.getEmployee().getUserEntity().getEmail();
            String fullName = saved.getEmployee().getUserEntity().getFullName();
            String statusStr = saved.getStatus().name();
            emailService.sendContractNotificationEmail(toEmail, fullName, "ĐƠN NGHỈ PHÉP: " + statusStr, "");
        } catch (Exception e) {
            log.error("Failed to send leave approval email", e);
        }

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, approve ? "APPROVE" : "REJECT", "LEAVE_REQUEST", id, null, saved));
        return leaveRequestMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public void cancel(Long id) {
        log.info("Cancelling leave request: {}", id);

        LeaveRequestEntity existing = leaveRequestRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        String oldValue = SimpleJsonWriter.toJson(existing);

        if (existing.getStatus() == LeaveStatusEnum.APPROVED) {
            // Cancellation after confirmation requires approval
            existing.setStatus(LeaveStatusEnum.PENDING);
            existing.setReason((existing.getReason() != null ? existing.getReason() : "") + " [Yêu cầu hủy đơn đã duyệt]");
        } else {
            existing.setStatus(LeaveStatusEnum.CANCELLED);
        }

        leaveRequestRepository.save(existing);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CANCEL", "LEAVE_REQUEST", id, oldValue, null));
    }

    @Override
    public PageResponse<LeaveRequestResponse> search(LeaveRequestSearchRequest request) {
        log.info("Searching LeaveRequest via specification");
        Specification<LeaveRequestEntity> spec = LeaveRequestSpecification.filterAndSearch(request);
        spec = spec.and(getLeaveSecuritySpecification());
        Pageable pageable = request.toPageable();
        Page<LeaveRequestEntity> page = leaveRequestRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(leaveRequestMapper::toResponse));
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
            return java.util.Collections.emptyList();
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

    private void verifyLeaveAccess(LeaveRequestEntity leave) {
        verifyEmployeeAccess(leave.getEmployee().getUserId());
    }

    private Specification<LeaveRequestEntity> getLeaveSecuritySpecification() {
        Long currentUserId = getCurrentUserId();
        List<String> roles = getCurrentUserRoles();

        if (roles.contains("ROLE_ADMIN") || roles.contains("ROLE_HR")) {
            return (root, query, cb) -> cb.conjunction();
        }

        Specification<LeaveRequestEntity> spec = (root, query, cb) -> cb.disjunction();
        spec = spec.or((root, query, cb) -> cb.equal(root.get("employee").get("userId"), currentUserId));

        return spec;
    }
}
