package com.ailms.repository;

import com.ailms.entity.EmployeeContractEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EmployeeContractRepository extends JpaRepository<EmployeeContractEntity, Long>, JpaSpecificationExecutor<EmployeeContractEntity> {
    List<EmployeeContractEntity> findByEmployee_UserId(Long userId);
    List<EmployeeContractEntity> findByStatusAndEndDate(BaseStatusEnum status, LocalDate endDate);
}
