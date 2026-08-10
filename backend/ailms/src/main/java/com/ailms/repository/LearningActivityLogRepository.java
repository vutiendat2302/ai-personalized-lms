package com.ailms.repository;

import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface LearningActivityLogRepository extends BaseRepository<LearningActivityLogEntity, Long> {
    List<LearningActivityLogEntity> findByUserId(Long userId);

    /** Lấy lịch sử học tập của một học viên theo trang, mới nhất trước. */
    Page<LearningActivityLogEntity> findByUserIdOrderByOccurredAtDesc(Long userId, Pageable pageable);

    /** Tìm learning log theo hành động và khoảng thời gian. */
    @Query("""
            SELECT l FROM LearningActivityLogEntity l
            WHERE l.userId = :userId
              AND (:action IS NULL OR LOWER(l.eventType) LIKE LOWER(CONCAT('%', :action, '%')))
              AND (:fromTime IS NULL OR l.occurredAt >= :fromTime)
              AND (:toTime IS NULL OR l.occurredAt <= :toTime)
            ORDER BY l.occurredAt DESC""")
    Page<LearningActivityLogEntity> searchByUserId(@Param("userId") Long userId,
            @Param("action") String action, @Param("fromTime") LocalDateTime fromTime,
            @Param("toTime") LocalDateTime toTime, Pageable pageable);

    /** Lấy một hoạt động học tập thuộc đúng học viên. */
    Optional<LearningActivityLogEntity> findByIdAndUserId(Long id, Long userId);

    void deleteByUserId(Long userId);

    List<LearningActivityLogEntity> findByEntityTypeAndEntityId(String entityType, Long entityId);

    Optional<LearningActivityLogEntity> findFirstByUserIdOrderByOccurredAtDesc(Long userId);

    @Query("SELECT l.occurredAt FROM LearningActivityLogEntity l WHERE l.userId = :userId AND l.occurredAt IS NOT NULL ORDER BY l.occurredAt ASC")
    List<LocalDateTime> findActivityTimesByUserId(
            @Param("userId") Long userId);

    long countByOccurredAtBetween(LocalDateTime from, LocalDateTime to);

    @Query("SELECT FUNCTION('DATE', l.occurredAt), COUNT(l) FROM LearningActivityLogEntity l WHERE l.occurredAt >= :from GROUP BY FUNCTION('DATE', l.occurredAt) ORDER BY FUNCTION('DATE', l.occurredAt)")
    List<Object[]> countActivityByDaySince(@Param("from") LocalDateTime from);

    List<LearningActivityLogEntity> findByOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtDesc(
            LocalDateTime from, LocalDateTime to);
}
