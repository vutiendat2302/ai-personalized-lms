package com.ailms.repository;

import com.ailms.entity.LeaveRequestEntity;
import com.ailms.entity.enums.LeaveStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequestEntity, Long>, JpaSpecificationExecutor<LeaveRequestEntity> {

    List<LeaveRequestEntity> findByEmployee_UserId(Long employeeId);

    @Query("SELECT l FROM LeaveRequestEntity l WHERE l.employee.userId = :employeeId " +
           "AND l.status = :status " +
           "AND l.startDate <= :date AND l.endDate >= :date")
    List<LeaveRequestEntity> findActiveLeaveOnDate(@Param("employeeId") Long employeeId,
                                                   @Param("status") LeaveStatusEnum status,
                                                   @Param("date") LocalDate date);

    @Query("SELECT l FROM LeaveRequestEntity l WHERE l.employee.userId = :employeeId " +
           "AND l.status = :status " +
           "AND l.startDate >= :startOfYear AND l.endDate <= :endOfYear")
    List<LeaveRequestEntity> findApprovedLeavesInYear(@Param("employeeId") Long employeeId,
                                                      @Param("status") LeaveStatusEnum status,
                                                      @Param("startOfYear") LocalDate startOfYear,
                                                      @Param("endOfYear") LocalDate endOfYear);
}
