package com.ailms.repository;

import com.ailms.entity.AttendanceEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends BaseRepository<AttendanceEntity, Long> {
    List<AttendanceEntity> findByEmployee_UserId(Long userId);

    Optional<AttendanceEntity> findByEmployee_UserIdAndWorkDate(Long userId, LocalDate workDate);

    List<AttendanceEntity> findByWorkDateBetween(LocalDate fromDate, LocalDate toDate);

    List<AttendanceEntity> findByWorkDate(LocalDate workDate);

    @Query("""
        SELECT a FROM AttendanceEntity a
        WHERE a.employee.userId = :userId
          AND a.workDate >= :start
          AND a.workDate <= :end
          AND a.status <> 'CANCELLED'
    """)
    List<AttendanceEntity> findByEmployeeAndDateRange(
            @Param("userId") Long userId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );
}
