package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.*;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IApprovalRequestService;
import com.ailms.service.IOrderService;
import com.ailms.request.RefundRequest;
import com.ailms.service.INotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ApprovalRequestService implements IApprovalRequestService {

    private final ApprovalRequestRepository approvalRequestRepository;
    private final EmployeeContractRepository employeeContractRepository;
    private final SalaryRepository salaryRepository;
    private final TeachingSessionPaymentRepository teachingSessionPaymentRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final INotificationService notificationService;
    private final IOrderService orderService;

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

        Optional<ApprovalRequestEntity> existingPending = approvalRequestRepository
                .findFirstByTargetTypeAndTargetIdAndStatusOrderByLevelDesc(targetType.toUpperCase(), targetId, ApprovalStatusEnum.PENDING);
        if (existingPending.isPresent()) {
            throw new BusinessException("An active approval request is already pending for this record.");
        }

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

        } else if ("LEAVE_REQUEST".equalsIgnoreCase(targetType)) {
            LeaveRequestEntity leave = leaveRequestRepository.findById(targetId)
                    .orElseThrow(() -> ResourceNotFoundException.of("LeaveRequest", targetId));
            if (leave.getStatus() != LeaveStatusEnum.PENDING && leave.getStatus() != LeaveStatusEnum.UNPAID) {
                throw new BusinessException("Leave request must be in PENDING or UNPAID status to request approval.");
            }
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

    /** Kiểm tra điều kiện refund và lưu yêu cầu chờ duyệt, chưa thực hiện refund PayPal. */
    @Override
    @Transactional
    public ApprovalRequestEntity createRefundRequest(Long orderId, RefundRequest request) {
        if (request == null || request.getReason() == null || request.getReason().isBlank()) {
            throw new BusinessException("Lý do hoàn tiền là bắt buộc.");
        }
        orderService.validateRefundEligibility(orderId, request.getReason());
        if (approvalRequestRepository.findFirstByTargetTypeAndTargetIdAndStatusOrderByLevelDesc(
                "REFUND_ORDER", orderId, ApprovalStatusEnum.PENDING).isPresent()) {
            throw new BusinessException("Đơn hàng đã có yêu cầu hoàn tiền đang chờ duyệt.");
        }
        ApprovalRequestEntity saved = approvalRequestRepository.save(ApprovalRequestEntity.builder()
                .targetType("REFUND_ORDER")
                .targetId(orderId)
                .totalLevels(1)
                .approverId(null)
                .status(ApprovalStatusEnum.PENDING)
                .requestReason(request.getReason().trim())
                .build());
        notifyRefundApprovers(saved);
        return saved;
    }

    /** Gửi thông báo tới HR/Admin để yêu cầu hoàn tiền không bị bỏ sót trong hàng đợi. */
    private void notifyRefundApprovers(ApprovalRequestEntity request) {
        userRoleRepository.findAll().stream()
                .filter(item -> item.getRoleEntity() != null && item.getRoleEntity().getCode() != null)
                .filter(item -> Set.of("HR", "ROLE_HR", "ADMIN", "ROLE_ADMIN")
                        .contains(item.getRoleEntity().getCode().toUpperCase()))
                .map(UserRoleEntity::getUserEntity)
                .filter(Objects::nonNull)
                .distinct()
                .forEach(user -> notificationService.createSystemNotification(
                        user, NotificationTypeEnum.GENERAL, "Có yêu cầu hoàn tiền cần duyệt",
                        "Đơn hàng #" + request.getTargetId() + " đang chờ HR/Admin phê duyệt hoàn tiền.",
                        request.getId(), "/admin/approval-center"));
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

        if (!currentUserId.equals(request.getApproverId()) && !isHrOrAdmin(currentUserId)) {
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

        finalizeTargetStatus(request, true);

        notifyCreator(request, true, comment);

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

        if (!currentUserId.equals(request.getApproverId()) && !isHrOrAdmin(currentUserId)) {
            throw new BusinessException("You are not authorized to reject this request.");
        }

        request.setStatus(ApprovalStatusEnum.REJECTED);
        request.setComment(comment);
        request.setDecidedAt(LocalDateTime.now());
        approvalRequestRepository.save(request);

        finalizeTargetStatus(request, false);

        notifyCreator(request, false, comment);

        return request;
    }

    private void notifyCreator(ApprovalRequestEntity request, boolean approved, String comment) {
        if (request.getCreatedBy() == null) return;
        userRepository.findById(request.getCreatedBy()).ifPresent(creator ->
                notificationService.createSystemNotification(
                        creator,
                        NotificationTypeEnum.GENERAL,
                        approved ? "Yêu cầu đã được phê duyệt" : "Yêu cầu đã bị từ chối",
                        approved
                                ? "Yêu cầu " + request.getTargetType() + " #" + request.getTargetId()
                                    + " đã được phê duyệt" + (comment == null || comment.isBlank() ? "." : ". Ghi chú: " + comment)
                                : "Yêu cầu " + request.getTargetType() + " #" + request.getTargetId()
                                    + " đã bị từ chối. Lý do: " + comment,
                        request.getTargetId(),
                        "/admin/approval-center"
                ));
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

        finalizeTargetStatus(request, false);
    }

    @Override
    public boolean isLocked(String targetType, Long targetId) {
        return approvalRequestRepository
                .findFirstByTargetTypeAndTargetIdAndStatusOrderByLevelDesc(targetType.toUpperCase(), targetId, ApprovalStatusEnum.PENDING)
                .isPresent();
    }

    @Override
    public List<ApprovalRequestEntity> getPendingRequestsForApprover(Long approverId) {
        return approvalRequestRepository.findAll().stream()
                .filter(r -> r.getStatus() == ApprovalStatusEnum.PENDING)
                .filter(r -> isHrOrAdmin(approverId) || approverId.equals(r.getApproverId()))
                .toList();
    }

    @Override
    public List<ApprovalRequestEntity> getRequestedByUser(Long userId) {
        return approvalRequestRepository.findAll().stream()
                .filter(request -> userId.equals(request.getCreatedBy()))
                .sorted(Comparator.comparing(
                        ApprovalRequestEntity::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .toList();
    }

    @Override
    public List<ApprovalRequestEntity> getAssignedToUser(Long userId) {
        return approvalRequestRepository.findAll().stream()
                .filter(request -> isHrOrAdmin(userId) || userId.equals(request.getApproverId()))
                .sorted(Comparator.comparing(
                        ApprovalRequestEntity::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .toList();
    }

    @Override
    public List<ApprovalRequestEntity> getAllRequests() {
        return approvalRequestRepository.findAll().stream()
                .sorted(Comparator.comparing(ApprovalRequestEntity::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Override
    @Transactional
    public void deleteApprovedRequest(Long id) {
        ApprovalRequestEntity request = approvalRequestRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("ApprovalRequest", id));
        if (request.getStatus() != ApprovalStatusEnum.CONFIRMED) {
            throw new BusinessException("Chỉ được xóa yêu cầu đã phê duyệt.");
        }
        approvalRequestRepository.delete(request);
    }

    private boolean isHrOrAdmin(Long userId) {
        return userRoleRepository.findByUserEntity_IdWithRole(userId).stream()
                .map(item -> item.getRoleEntity().getCode())
                .filter(Objects::nonNull)
                .map(String::toUpperCase)
                .anyMatch(code -> code.equals("HR") || code.equals("ROLE_HR")
                        || code.equals("ADMIN") || code.equals("ROLE_ADMIN"));
    }

    private Long resolveNextApprover(String targetType, int nextLevel) {
        if (nextLevel == 2 && List.of(
                "LEAVE_REQUEST", "HALF_DAY_LEAVE", "RESIGNATION",
                "CLASS_TRANSFER_REQUEST", "TEACHER_CHANGE_REQUEST"
        ).contains(targetType.toUpperCase())) {
            return firstUserByRole("ADMIN", "ROLE_ADMIN");
        }
        if ("SALARY".equalsIgnoreCase(targetType) && nextLevel == 2) {
            Optional<RoleEntity> payrollRole = roleRepository.findByCode("PAYROLL");
            if (payrollRole.isEmpty()) {
                payrollRole = roleRepository.findByCode("ACCOUNTANT");
            }
            if (payrollRole.isPresent()) {
                List<UserRoleEntity> userRoles = userRoleRepository.findByRoleEntity_Id(payrollRole.get().getId());
                if (!userRoles.isEmpty()) {
                    return userRoles.getFirst().getUserEntity().getId();
                }
            }
        }
        return 1L; 
    }

    private Long firstUserByRole(String... roleCodes) {
        for (String roleCode : roleCodes) {
            Optional<RoleEntity> role = roleRepository.findByCode(roleCode);
            if (role.isPresent()) {
                List<UserRoleEntity> assignments = userRoleRepository.findByRoleEntity_Id(role.get().getId());
                if (!assignments.isEmpty()) return assignments.getFirst().getUserEntity().getId();
            }
        }
        throw new BusinessException("Không tìm thấy người dùng phù hợp cho cấp phê duyệt tiếp theo.");
    }

    /** Áp dụng trạng thái nghiệp vụ sau quyết định phê duyệt. */
    private void finalizeTargetStatus(ApprovalRequestEntity request, boolean approved) {
        String targetType = request.getTargetType();
        Long targetId = request.getTargetId();
        if ("REFUND_ORDER".equalsIgnoreCase(targetType)) {
            if (approved) {
                orderService.refundOrder(targetId, RefundRequest.builder()
                        .reason(request.getRequestReason())
                        .build());
            }
        } else if ("CONTRACT".equalsIgnoreCase(targetType)) {
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

        } else if ("LEAVE_REQUEST".equalsIgnoreCase(targetType)) {
            LeaveRequestEntity leave = leaveRequestRepository.findById(targetId)
                    .orElseThrow(() -> ResourceNotFoundException.of("LeaveRequest", targetId));
            leave.setStatus(approved ? LeaveStatusEnum.APPROVED : LeaveStatusEnum.REJECTED);
            leaveRequestRepository.save(leave);
        }
    }
}
