package com.ailms.repository;

import com.ailms.entity.DepartmentEntity;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.repository.base.BaseRepository;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface DepartmentRepository extends BaseRepository<DepartmentEntity, Long> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    @Query("SELECT COUNT(d) FROM DepartmentEntity d WHERE d.status = BaseStatusEnum.ACTIVE")
    long countActiveDepartments();

    @Query("SELECT COUNT(d) FROM DepartmentEntity d WHERE NOT EXISTS (SELECT e FROM EmployeeEntity e WHERE e.department.id = d.id)")
    long countEmptyDepartments();

    @Query("SELECT d.name, COUNT(DISTINCT e) " +
            "FROM DepartmentEntity d " +
            "JOIN d.employees e " +
            "JOIN e.userEntity u " +
            "LEFT JOIN EmployeeContractEntity c ON c.employee.userId = e.userId AND c.status <> BaseStatusEnum.INACTIVE " +
            "WHERE u.status <> :userStatus " +
            "AND e.status <> :employeeStatus " +
            "AND (" +
            "  :startOfYearDate IS NULL OR (" +
            "    (c.id IS NOT NULL AND (c.startDate IS NULL OR c.startDate <= :endOfYearDate) AND (c.endDate IS NULL OR c.endDate >= :startOfYearDate)) OR " +
            "    (c.id IS NULL AND (e.startDate IS NULL OR CAST(e.startDate AS date) <= :endOfYearDate) AND (e.endDate IS NULL OR CAST(e.endDate AS date) >= :startOfYearDate))" +
            "  )" +
            ") " +
            "GROUP BY d.id, d.name")
    List<Object[]> countEmployeesByDepartmentAndYear(
            @Param("userStatus") UserStatusEnum userStatus,
            @Param("employeeStatus") EmployeeStatusEnum employeeStatus,
            @Param("startOfYearDate") LocalDate startOfYearDate,
            @Param("endOfYearDate") LocalDate endOfYearDate
    );

    @Query("SELECT d.name, e.employmentTypeEnum, COUNT(DISTINCT e) " +
            "FROM DepartmentEntity d " +
            "JOIN d.employees e " +
            "JOIN e.userEntity u " +
            "LEFT JOIN EmployeeContractEntity c ON c.employee.userId = e.userId AND c.status <> BaseStatusEnum.INACTIVE " +
            "WHERE u.status <> :deletedStatus " +
            "AND e.status <> :terminatedStatus " +
            "AND (" +
            "  :startOfYearDate IS NULL OR (" +
            "    (c.id IS NOT NULL AND (c.startDate IS NULL OR c.startDate <= :endOfYearDate) AND (c.endDate IS NULL OR c.endDate >= :startOfYearDate)) OR " +
            "    (c.id IS NULL AND (e.startDate IS NULL OR CAST(e.startDate AS date) <= :endOfYearDate) AND (e.endDate IS NULL OR CAST(e.endDate AS date) >= :startOfYearDate))" +
            "  )" +
            ") " +
            "GROUP BY d.id, d.name, e.employmentTypeEnum")
    List<Object[]> countEmploymentTypesByDepartmentAndYear(
            @Param("deletedStatus") UserStatusEnum deletedStatus,
            @Param("terminatedStatus") EmployeeStatusEnum terminatedStatus,
            @Param("startOfYearDate") LocalDate startOfYearDate,
            @Param("endOfYearDate") LocalDate endOfYearDate
    );
}

