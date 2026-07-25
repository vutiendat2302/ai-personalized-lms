package com.ailms.repository;

import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends BaseRepository<EmployeeEntity, Long> {
    Optional<EmployeeEntity> findByEmployeeCode(String employeeCode);

    boolean existsByEmployeeCode(String employeeCode);

    boolean existsByDepartment_Id(Long departmentId);
    boolean existsByDepartment_IdAndStatusNot(Long departmentId, EmployeeStatusEnum status);

    List<EmployeeEntity> findAllByStatusNot(EmployeeStatusEnum status);

    long countByStatusNot(EmployeeStatusEnum status);

    @org.springframework.data.jpa.repository.Query("SELECT e.status, COUNT(e) FROM EmployeeEntity e WHERE e.status != :status GROUP BY e.status")
    List<Object[]> countEmployeesGroupByStatus(@org.springframework.data.repository.query.Param("status") EmployeeStatusEnum status);
}

