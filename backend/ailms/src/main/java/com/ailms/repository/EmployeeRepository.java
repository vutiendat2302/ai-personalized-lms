package com.ailms.repository;

import com.ailms.entity.EmployeeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<EmployeeEntity, Long>, JpaSpecificationExecutor<EmployeeEntity> {
    Optional<EmployeeEntity> findByEmployeeCode(String employeeCode);
    boolean existsByEmployeeCode(String employeeCode);
}
