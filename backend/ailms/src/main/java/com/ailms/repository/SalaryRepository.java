package com.ailms.repository;

import com.ailms.entity.SalaryEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

@Repository
public interface SalaryRepository extends BaseRepository<SalaryEntity, Long> {
    List<SalaryEntity> findByEmployee_UserId(Long userId);
    Optional<SalaryEntity> findByEmployee_UserIdAndPeriod(Long userId, YearMonth period);
    boolean existsByEmployee_UserIdAndPeriod(Long userId, YearMonth period);
    List<SalaryEntity> findByPeriod(YearMonth period);
    List<SalaryEntity> findByPeriodBetween(YearMonth startPeriod, YearMonth endPeriod);
}
