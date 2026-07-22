package com.ailms.repository;

import com.ailms.entity.LearningSessionEntity;
import com.ailms.entity.enums.SessionStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LearningSessionRepository extends JpaRepository<LearningSessionEntity, Long>, JpaSpecificationExecutor<LearningSessionEntity> {

    List<LearningSessionEntity> findByUserIdAndStatus(Long userId, SessionStatusEnum status);

    @Query("SELECT s FROM LearningSessionEntity s WHERE s.status = :status AND s.lastHeartbeatAt < :threshold")
    List<LearningSessionEntity> findStaleActiveSessions(@Param("status") SessionStatusEnum status,
                                                         @Param("threshold") LocalDateTime threshold);

    @Query("SELECT SUM(s.activeSeconds) FROM LearningSessionEntity s WHERE s.userId = :userId " +
           "AND s.lastHeartbeatAt >= :startDate AND s.lastHeartbeatAt <= :endDate")
    Long sumActiveSecondsForUserInPeriod(@Param("userId") Long userId,
                                         @Param("startDate") LocalDateTime startDate,
                                         @Param("endDate") LocalDateTime endDate);
}
