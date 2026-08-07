package com.ailms.repository;

import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.repository.base.BaseRepository;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface LearningActivityLogRepository extends BaseRepository<LearningActivityLogEntity, Long> {
    List<LearningActivityLogEntity> findByUserId(Long userId);

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
