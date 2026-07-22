package com.ailms.controller;

import com.ailms.entity.ApprovalRequestEntity;
import com.ailms.response.ApiResponse;
import com.ailms.service.IApprovalRequestService;
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

@RestController
@RequestMapping("${api.prefix}/approvals")
@RequiredArgsConstructor
public class ApprovalRequestController {

    private final IApprovalRequestService approvalRequestService;

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
