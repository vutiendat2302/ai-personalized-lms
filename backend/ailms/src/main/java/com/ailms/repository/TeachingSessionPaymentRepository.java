package com.ailms.repository;

import com.ailms.entity.TeachingSessionPaymentEntity;
import com.ailms.entity.enums.SessionPaymentStatusEnum;
import com.ailms.repository.base.BaseRepository;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TeachingSessionPaymentRepository extends BaseRepository<TeachingSessionPaymentEntity, Long> {
    Optional<TeachingSessionPaymentEntity> findByClassOnlineId(Long classOnlineId);
    Optional<TeachingSessionPaymentEntity> findByClassOnlineIdAndEmployee_UserId(Long classOnlineId, Long employeeId);
    List<TeachingSessionPaymentEntity> findByEmployee_UserId(Long userId);
    boolean existsByTeachingRate_Id(Long rateId);

    @Query("""
        SELECT tsp FROM TeachingSessionPaymentEntity tsp
        WHERE tsp.employee.userId = :userId
          AND tsp.status = :status
          AND tsp.classOnline.scheduledAt >= :start
          AND tsp.classOnline.scheduledAt <= :end
    """)
    List<TeachingSessionPaymentEntity> findByEmployeeAndStatusAndPeriod(
            @Param("userId") Long userId,
            @Param("status") SessionPaymentStatusEnum status,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
}
