package com.ailms.repository;

import com.ailms.entity.SalaryDetailEntity;
import org.springframework.data.repository.Repository;

import java.util.List;

public interface SalaryDetailRepository extends Repository<SalaryDetailEntity, Long> {
    List<SalaryDetailEntity> findBySalary_Id(Long salaryId);
}
