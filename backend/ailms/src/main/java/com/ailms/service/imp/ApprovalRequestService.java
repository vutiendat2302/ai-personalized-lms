package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.*;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IApprovalRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ApprovalRequestService implements IApprovalRequestService {

    private final ApprovalRequestRepository approvalRequestRepository;
    private final EmployeeContractRepository employeeContractRepository;
    private final SalaryRepository salaryRepository;
    private final TeachingSessionPaymentRepository teachingSessionPaymentRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getUser().getId();
        }
        throw new BusinessException("User is not authenticated");
    }

    @Override
    @Transactional
    public ApprovalRequestEntity createRequest(String targetType, Long targetId, int totalLevels, Long approverId) {
        log.info("Creating approval request for targetType={}, targetId={}, totalLevels={}, approverId={}",
                targetType, targetId, totalLevels, approverId);

        // Check if there is already a PENDING approval request
        Optional<ApprovalRequestEntity> existingPending = approvalRequestRepository
                .findFirstByTargetTypeAndTargetIdAndStatusOrderByLevelDesc(targetType, targetId, ApprovalStatusEnum.PENDING);
        if (existingPending.isPresent()) {
            throw new BusinessException("An active approval request is already pending for this record.");
        }

        // Validate target and transition its status
        if ("CONTRACT".equalsIgnoreCase(targetType)) {
            EmployeeContractEntity contract = employeeContractRepository.findById(targetId)
                    .orElseThrow(() -> ResourceNotFoundException.of("EmployeeContract", targetId));
            if (contract.getStatus() != BaseStatusEnum.DRAFT && contract.getStatus() != BaseStatusEnum.REJECTED) {
                throw new BusinessException("Contract must be in DRAFT or REJECTED status to request approval.");
            }
            contract.setStatus(BaseStatusEnum.PENDING);
            employeeContractRepository.save(contract);

        } else if ("SALARY".equalsIgnoreCase(targetType)) {
            SalaryEntity salary = salaryRepository.findById(targetId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Salary", targetId));
            if (salary.getStatus() != SalaryStatusEnum.DRAFT) {
                throw new BusinessException("Salary must be in DRAFT status to request approval.");
            }
            salary.setStatus(SalaryStatusEnum.PENDING);
            salaryRepository.save(salary);

        } else if ("TEACHING_PAYMENT".equalsIgnoreCase(targetType)) {
            TeachingSessionPaymentEntity payment = teachingSessionPaymentRepository.findById(targetId)
                    .orElseThrow(() -> ResourceNotFoundException.of("TeachingSessionPayment", targetId));
            if (payment.getStatus() != SessionPaymentStatusEnum.PENDING) {
                throw new BusinessException("Payment must be in PENDING status to request approval.");
            }
            // Keep status as PENDING, but the presence of the active ApprovalRequest will lock it

        } else {
            throw new BusinessException("Unsupported target type: " + targetType);
        }

        ApprovalRequestEntity request = ApprovalRequestEntity.builder()
                .targetType(targetType.toUpperCase())
                .targetId(targetId)
                .level(1)
                .totalLevels(totalLevels)
                .approverId(approverId)
                .status(ApprovalStatusEnum.PENDING)
                .build();

        return approvalRequestRepository.save(request);
    }

    @Override
    @Transactional
    public ApprovalRequestEntity approve(Long id, String comment) {
        Long currentUserId = getCurrentUserId();
        log.info("Approving request id={} by user={}", id, currentUserId);

        ApprovalRequestEntity request = approvalRequestRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("ApprovalRequest", id));

        if (request.getStatus() != ApprovalStatusEnum.PENDING) {
            throw new BusinessException("Approval request is not in PENDING status.");
        }

        if (!currentUserId.equals(request.getApproverId())) {
            throw new BusinessException("You are not authorized to approve this request.");
        }

        // B.4: Creator cannot approve their own request
        if (currentUserId.equals(request.getCreatedBy())) {
            throw new BusinessException("You cannot approve your own request.");
        }

        request.setStatus(ApprovalStatusEnum.CONFIRMED);
        request.setComment(comment);
        request.setDecidedAt(LocalDateTime.now());
        approvalRequestRepository.save(request);

        if (request.getLevel() < request.getTotalLevels()) {
            // Create next level approval request
            int nextLevel = request.getLevel() + 1;
            Long nextApproverId = resolveNextApprover(request.getTargetType(), nextLevel);

            ApprovalRequestEntity nextRequest = ApprovalRequestEntity.builder()
                    .targetType(request.getTargetType())
                    .targetId(request.getTargetId())
                    .level(nextLevel)
                    .totalLevels(request.getTotalLevels())
                    .approverId(nextApproverId)
                    .status(ApprovalStatusEnum.PENDING)
                    .build();

            // Carry over creation audit attributes so the creator restriction holds
            nextRequest.setCreatedBy(request.getCreatedBy());
            approvalRequestRepository.save(nextRequest);
        } else {
            // Final level approved -> update target status
            finalizeTargetStatus(request.getTargetType(), request.getTargetId(), true);
        }

        return request;
    }

    @Override
    @Transactional
    public ApprovalRequestEntity reject(Long id, String comment) {
        if (comment == null || comment.trim().isEmpty()) {
            throw new BusinessException("Comment is required when rejecting.");
        }

        Long currentUserId = getCurrentUserId();
        log.info("Rejecting request id={} by user={}", id, currentUserId);

        ApprovalRequestEntity request = approvalRequestRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("ApprovalRequest", id));

        if (request.getStatus() != ApprovalStatusEnum.PENDING) {
            throw new BusinessException("Approval request is not in PENDING status.");
        }

        if (!currentUserId.equals(request.getApproverId())) {
            throw new BusinessException("You are not authorized to reject this request.");
        }

        request.setStatus(ApprovalStatusEnum.REJECTED);
        request.setComment(comment);
        request.setDecidedAt(LocalDateTime.now());
        approvalRequestRepository.save(request);

        // Reject updates target status back to DRAFT or REJECTED
        finalizeTargetStatus(request.getTargetType(), request.getTargetId(), false);

        return request;
    }

    @Override
    @Transactional
    public void cancel(Long id) {
        Long currentUserId = getCurrentUserId();
        log.info("Cancelling request id={} by user={}", id, currentUserId);

        ApprovalRequestEntity request = approvalRequestRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("ApprovalRequest", id));

        if (request.getStatus() != ApprovalStatusEnum.PENDING) {
            throw new BusinessException("Only pending requests can be cancelled.");
        }

        if (!currentUserId.equals(request.getCreatedBy())) {
            throw new BusinessException("Only the request creator can cancel this request.");
        }

        request.setStatus(ApprovalStatusEnum.CANCELLED);
        request.setDecidedAt(LocalDateTime.now());
        approvalRequestRepository.save(request);

        // Revert target back to DRAFT / original state
        finalizeTargetStatus(request.getTargetType(), request.getTargetId(), false);
    }

    @Override
    public boolean isLocked(String targetType, Long targetId) {
        return approvalRequestRepository
                .findFirstByTargetTypeAndTargetIdAndStatusOrderByLevelDesc(targetType.toUpperCase(), targetId, ApprovalStatusEnum.PENDING)
                .isPresent();
    }

    @Override
    public List<ApprovalRequestEntity> getPendingRequestsForApprover(Long approverId) {
        // Typically custom query can be written, or simple spec/filter
        return approvalRequestRepository.findAll().stream()
                .filter(r -> approverId.equals(r.getApproverId()) && r.getStatus() == ApprovalStatusEnum.PENDING)
                .toList();
    }

    private Long resolveNextApprover(String targetType, int nextLevel) {
        if ("SALARY".equalsIgnoreCase(targetType) && nextLevel == 2) {
            // Find user with PAYROLL or ACCOUNTANT role
            Optional<RoleEntity> payrollRole = roleRepository.findByCode("PAYROLL");
            if (payrollRole.isEmpty()) {
                payrollRole = roleRepository.findByCode("ACCOUNTANT");
            }
            if (payrollRole.isPresent()) {
                List<UserRoleEntity> userRoles = userRoleRepository.findByRoleEntity_Id(payrollRole.get().getId());
                if (!userRoles.isEmpty()) {
                    return userRoles.get(0).getUserEntity().getId();
                }
            }
        }
        // Fallback: return default admin/system user
        return 1L; 
    }

    private void finalizeTargetStatus(String targetType, Long targetId, boolean approved) {
        if ("CONTRACT".equalsIgnoreCase(targetType)) {
            EmployeeContractEntity contract = employeeContractRepository.findById(targetId)
                    .orElseThrow(() -> ResourceNotFoundException.of("EmployeeContract", targetId));
            contract.setStatus(approved ? BaseStatusEnum.ACTIVE : BaseStatusEnum.REJECTED);
            employeeContractRepository.save(contract);

        } else if ("SALARY".equalsIgnoreCase(targetType)) {
            SalaryEntity salary = salaryRepository.findById(targetId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Salary", targetId));
            salary.setStatus(approved ? SalaryStatusEnum.CONFIRMED : SalaryStatusEnum.DRAFT);
            salaryRepository.save(salary);

        } else if ("TEACHING_PAYMENT".equalsIgnoreCase(targetType)) {
            TeachingSessionPaymentEntity payment = teachingSessionPaymentRepository.findById(targetId)
                    .orElseThrow(() -> ResourceNotFoundException.of("TeachingSessionPayment", targetId));
            payment.setStatus(approved ? SessionPaymentStatusEnum.CONFIRMED : SessionPaymentStatusEnum.PENDING);
            teachingSessionPaymentRepository.save(payment);
        }
    }
}
