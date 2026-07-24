package com.ailms.repository;

import com.ailms.entity.AttendanceEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AttendanceRepository extends BaseRepository<AttendanceEntity, Long> {
    List<AttendanceEntity> findByEmployee_UserId(Long userId);

    @Query("""
        SELECT a FROM AttendanceEntity a
        WHERE a.employee.userId = :userId
          AND a.checkInTime >= :start
          AND a.checkInTime <= :end
          AND a.status <> 'CANCELLED'
    """)
    List<AttendanceEntity> findByEmployeeAndDateRange(
            @Param("userId") Long userId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
}
