package com.ailms.controller;

import com.ailms.entity.ApprovalRequestEntity;
import com.ailms.response.ApiResponse;
import com.ailms.service.IApprovalRequestService;
import com.ailms.repository.UserRepository;
import com.ailms.repository.ApprovalRequestRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.entity.enums.ApprovalStatusEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.security.CustomUserDetails;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@RestController
@RequestMapping("${api.prefix}/approvals")
@RequiredArgsConstructor
public class ApprovalRequestController {

    private final IApprovalRequestService approvalRequestService;
    private final UserRepository userRepository;
    private final ApprovalRequestRepository approvalRequestRepository;
    private final CourseRepository courseRepository;

    @PostMapping("/request")
    public ResponseEntity<ApiResponse<ApprovalRequestEntity>> createRequest(
            @Valid @RequestBody CreateApprovalRequestPayload payload) {
        ApprovalRequestEntity request = approvalRequestService.createRequest(
                payload.getTargetType(),
                payload.getTargetId(),
                payload.getTotalLevels(),
                payload.getApproverId()
        );
        return ResponseEntity.ok(ApiResponse.of("Approval request created successfully", request));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<ApprovalRequestEntity>> approve(
            @PathVariable Long id,
            @RequestBody(required = false) ApproveRejectPayload payload) {
        String comment = payload != null ? payload.getComment() : "";
        ApprovalRequestEntity request = approvalRequestService.approve(id, comment);
        return ResponseEntity.ok(ApiResponse.of("Request approved successfully", request));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<ApprovalRequestEntity>> reject(
            @PathVariable Long id,
            @Valid @RequestBody ApproveRejectPayload payload) {
        ApprovalRequestEntity request = approvalRequestService.reject(id, payload.getComment());
        return ResponseEntity.ok(ApiResponse.of("Request rejected successfully", request));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancel(@PathVariable Long id) {
        approvalRequestService.cancel(id);
        return ResponseEntity.ok(ApiResponse.of("Request cancelled successfully", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteApproved(@PathVariable Long id) {
        approvalRequestService.deleteApprovedRequest(id);
        return ResponseEntity.ok(ApiResponse.of("Approved request history deleted successfully", null));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<ApprovalRequestEntity>>> getPendingRequests() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            Long userId = userDetails.getUser().getId();
            List<ApprovalRequestEntity> pending = approvalRequestService.getPendingRequestsForApprover(userId);
            return ResponseEntity.ok(ApiResponse.of(pending));
        }
        return ResponseEntity.status(401).build();
    }

    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<Map<String, List<Map<String, Object>>>>> getMine() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            Long userId = userDetails.getUser().getId();
            boolean hrOrAdmin = auth.getAuthorities().stream()
                    .map(authority -> authority.getAuthority().toUpperCase())
                    .anyMatch(role -> role.equals("ROLE_HR") || role.equals("HR")
                            || role.equals("ROLE_ADMIN") || role.equals("ADMIN"));
            List<ApprovalRequestEntity> assigned = hrOrAdmin
                    ? approvalRequestService.getAllRequests()
                    : approvalRequestService.getAssignedToUser(userId);
            Map<String, List<Map<String, Object>>> result = Map.of(
                    "requested", approvalRequestService.getRequestedByUser(userId).stream().map(this::toUserResponse).toList(),
                    "toApprove", assigned.stream().map(this::toUserResponse).toList()
            );
            return ResponseEntity.ok(ApiResponse.of("Approval requests retrieved successfully", result));
        }
        return ResponseEntity.status(401).build();
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getSummary() {
        Map<String, Long> summary = Map.of(
                "pending", approvalRequestRepository.countByStatus(ApprovalStatusEnum.PENDING)
                        + courseRepository.countByStatus(CourseStatusEnum.PENDING),
                "approved", approvalRequestRepository.countByStatus(ApprovalStatusEnum.CONFIRMED),
                "rejected", approvalRequestRepository.countByStatus(ApprovalStatusEnum.REJECTED)
        );
        return ResponseEntity.ok(ApiResponse.of("Approval summary retrieved successfully", summary));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<Map<String, List<Map<String, Object>>>>> getByUser(
            @PathVariable Long userId) {
        Map<String, List<Map<String, Object>>> result = Map.of(
                "requested", approvalRequestService.getRequestedByUser(userId).stream().map(this::toUserResponse).toList(),
                "toApprove", approvalRequestService.getAssignedToUser(userId).stream().map(this::toUserResponse).toList()
        );
        return ResponseEntity.ok(ApiResponse.of("User approval requests retrieved successfully", result));
    }

    private Map<String, Object> toUserResponse(ApprovalRequestEntity request) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", request.getId());
        item.put("targetType", request.getTargetType());
        item.put("targetId", request.getTargetId());
        item.put("approverId", request.getApproverId());
        item.put("status", request.getStatus());
        item.put("comment", request.getComment());
        item.put("createdBy", request.getCreatedBy());
        item.put("createdAt", request.getCreatedAt());
        item.put("decidedAt", request.getDecidedAt());
        item.put("level", request.getLevel());
        item.put("totalLevels", request.getTotalLevels());
        if (request.getCreatedBy() != null) {
            userRepository.findById(request.getCreatedBy()).ifPresent(user -> {
                item.put("requesterName", user.getFullName());
                item.put("requesterEmail", user.getEmail());
            });
        }
        if (request.getApproverId() != null) {
            userRepository.findById(request.getApproverId()).ifPresent(user -> item.put("approverName", user.getFullName()));
        }
        return item;
    }

    @Data
    public static class CreateApprovalRequestPayload {
        @NotBlank(message = "Target type is required")
        private String targetType;

        @NotNull(message = "Target ID is required")
        private Long targetId;

        private int totalLevels = 1;

        @NotNull(message = "Approver ID is required")
        private Long approverId;
    }

    @Data
    public static class ApproveRejectPayload {
        private String comment;
    }
}
