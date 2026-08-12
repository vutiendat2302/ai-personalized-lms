package com.ailms.repository;

import com.ailms.entity.AuditLogEntity;
import com.ailms.entity.UserEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface AuditLogRepository extends BaseRepository<AuditLogEntity, Long> {
    List<AuditLogEntity> user(UserEntity user);

    List<AuditLogEntity> findByUser_Id(Long userId);
    /** Lấy lịch sử hệ thống của người dùng theo trang, mới nhất trước. */
    Page<AuditLogEntity> findByUser_IdOrderByOccurredAtDesc(Long userId, Pageable pageable);
    /** Tìm audit log theo hành động và khoảng thời gian. */
    @Query("""
            SELECT a FROM AuditLogEntity a
            WHERE a.user.id = :userId
              AND (:action IS NULL OR LOWER(a.action) LIKE LOWER(CONCAT('%', :action, '%')))
              AND (:fromTime IS NULL OR a.occurredAt >= :fromTime)
              AND (:toTime IS NULL OR a.occurredAt <= :toTime)
            ORDER BY a.occurredAt DESC""")
    Page<AuditLogEntity> searchByUserId(@Param("userId") Long userId,
            @Param("action") String action, @Param("fromTime") java.time.LocalDateTime fromTime,
            @Param("toTime") java.time.LocalDateTime toTime, Pageable pageable);
    /** Lấy một nhật ký hệ thống thuộc đúng người dùng. */
    Optional<AuditLogEntity> findByIdAndUser_Id(Long id, Long userId);
    List<AuditLogEntity> findByEntityTypeAndEntityIdOrderByOccurredAtDesc(String entityType, Long entityId);
}
