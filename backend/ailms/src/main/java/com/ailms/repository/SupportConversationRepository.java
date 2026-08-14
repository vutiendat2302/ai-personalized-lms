package com.ailms.repository;

import com.ailms.entity.SupportConversationEntity;
import com.ailms.entity.enums.SupportConversationStatusEnum;
import com.ailms.repository.base.BaseRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Truy vấn và khóa phiên support để bảo vệ state machine/queue. */
@Repository
public interface SupportConversationRepository extends BaseRepository<SupportConversationEntity, Long> {
    /** Lấy conversation đang mở duy nhất của visitor. */
    Optional<SupportConversationEntity> findFirstByVisitor_IdAndStatusInOrderByCreatedAtDesc(
            Long visitorId, Collection<SupportConversationStatusEnum> statuses);

    /** Lấy lịch sử conversation của visitor theo thời gian mới nhất. */
    Page<SupportConversationEntity> findByVisitor_IdOrderByCreatedAtDesc(Long visitorId, Pageable pageable);

    /** Khóa conversation trước khi thực hiện transition. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM SupportConversationEntity c WHERE c.id = :id")
    Optional<SupportConversationEntity> findByIdForUpdate(@Param("id") Long id);

    /** Lấy ticket FIFO trong hàng đợi. */
    List<SupportConversationEntity> findByStatusOrderByCreatedAtAsc(SupportConversationStatusEnum status);

    /** Lấy conversation được HR phân công. */
    Page<SupportConversationEntity> findByAssignedHr_IdAndStatusIn(Long hrId,
                                                                     Collection<SupportConversationStatusEnum> statuses,
                                                                     Pageable pageable);

    /** Lấy các phiên trực tiếp để job kiểm tra timeout phản hồi của visitor. */
    List<SupportConversationEntity> findByStatusIn(Collection<SupportConversationStatusEnum> statuses);

    /** Đếm ticket trước thời điểm tạo để hiển thị vị trí FIFO. */
    long countByStatusAndCreatedAtLessThan(SupportConversationStatusEnum status,
                                            java.time.LocalDateTime createdAt);

    /** Đếm workload mở của một supporter để cân bằng hàng đợi cá nhân. */
    long countByAssignedHr_IdAndStatusIn(Long hrId, Collection<SupportConversationStatusEnum> statuses);

    /** Kiểm tra supporter còn ticket khác sau khi kết thúc một conversation. */
    long countByAssignedHr_IdAndStatusInAndIdNot(Long hrId, Collection<SupportConversationStatusEnum> statuses,
                                                  Long excludedConversationId);

    /** Trả ticket của supporter mất heartbeat về queue chung để không bị kẹt. */
    @Modifying
    @Query("""
        UPDATE SupportConversationEntity c
        SET c.assignedHr = null, c.status = com.ailms.entity.enums.SupportConversationStatusEnum.QUEUED,
            c.startedAt = null, c.queuePosition = null, c.estimatedWaitMinutes = null
        WHERE c.status IN :statuses
          AND c.assignedHr.id IN (SELECT p.hrId FROM SupportHrPresenceEntity p WHERE p.lastHeartbeatAt < :heartbeatSince)
        """)
    int requeueFromStaleSupporters(@Param("statuses") Collection<SupportConversationStatusEnum> statuses,
                                    @Param("heartbeatSince") java.time.LocalDateTime heartbeatSince);

    /** Trả ticket về queue ngay khi supporter chủ động rời trang. */
    @Modifying
    @Query("""
        UPDATE SupportConversationEntity c
        SET c.assignedHr = null, c.status = com.ailms.entity.enums.SupportConversationStatusEnum.QUEUED,
            c.startedAt = null, c.queuePosition = null, c.estimatedWaitMinutes = null
        WHERE c.status IN :statuses AND c.assignedHr.id = :hrId
        """)
    int requeueFromOfflineSupporter(@Param("hrId") Long hrId,
                                     @Param("statuses") Collection<SupportConversationStatusEnum> statuses);
}
