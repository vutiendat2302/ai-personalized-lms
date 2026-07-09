package com.ailms.repository;

import com.ailms.entity.AttendanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceRepository extends JpaRepository<AttendanceEntity, Long>, JpaSpecificationExecutor<AttendanceEntity> {
    List<AttendanceEntity> findByEmployee_UserId(Long userId);
}
