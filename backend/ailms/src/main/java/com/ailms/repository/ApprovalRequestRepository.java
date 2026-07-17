package com.ailms.repository;

import com.ailms.entity.ApprovalRequestEntity;
import com.ailms.entity.enums.ApprovalStatusEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ApprovalRequestRepository extends BaseRepository<ApprovalRequestEntity, Long> {
    Optional<ApprovalRequestEntity> findFirstByTargetTypeAndTargetIdAndStatusOrderByLevelDesc(
            String targetType, Long targetId, ApprovalStatusEnum status);
}
