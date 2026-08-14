package com.ailms.repository;

import com.ailms.entity.ApprovalRequestEntity;
import com.ailms.entity.enums.ApprovalStatusEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface ApprovalRequestRepository extends BaseRepository<ApprovalRequestEntity, Long> {
    long countByStatus(ApprovalStatusEnum status);
    Optional<ApprovalRequestEntity> findFirstByTargetTypeAndTargetIdAndStatusOrderByLevelDesc(
            String targetType, Long targetId, ApprovalStatusEnum status);

    /** Lấy các yêu cầu do người dùng hiện tại tạo theo thời gian mới nhất. */
    List<ApprovalRequestEntity> findByCreatedByOrderByCreatedAtDesc(Long createdBy);
}
