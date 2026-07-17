package com.ailms.service;

import com.ailms.entity.ApprovalRequestEntity;
import java.util.List;

public interface IApprovalRequestService {
    ApprovalRequestEntity createRequest(String targetType, Long targetId, int totalLevels, Long approverId);
    ApprovalRequestEntity approve(Long id, String comment);
    ApprovalRequestEntity reject(Long id, String comment);
    void cancel(Long id);
    boolean isLocked(String targetType, Long targetId);
    List<ApprovalRequestEntity> getPendingRequestsForApprover(Long approverId);
}
