package com.ailms.repository;

import com.ailms.entity.SalaryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

@Repository
public interface SalaryRepository extends JpaRepository<SalaryEntity, Long>, JpaSpecificationExecutor<SalaryEntity> {
    List<SalaryEntity> findByEmployee_UserId(Long userId);
    Optional<SalaryEntity> findByEmployee_UserIdAndPeriod(Long userId, String period);
    boolean existsByEmployee_UserIdAndPeriod(Long userId, YearMonth period);
}
