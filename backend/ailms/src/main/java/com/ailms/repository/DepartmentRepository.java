package com.ailms.repository;

import com.ailms.entity.DepartmentEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DepartmentRepository extends BaseRepository<DepartmentEntity, Long> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(d) FROM DepartmentEntity d WHERE d.status = com.ailms.entity.enums.BaseStatusEnum.ACTIVE")
    long countActiveDepartments();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(d) FROM DepartmentEntity d WHERE NOT EXISTS (SELECT e FROM EmployeeEntity e WHERE e.department.id = d.id)")
    long countEmptyDepartments();

    @org.springframework.data.jpa.repository.Query("SELECT d.name, COUNT(e) FROM DepartmentEntity d LEFT JOIN d.employees e GROUP BY d.id, d.name ORDER BY COUNT(e) DESC")
    java.util.List<Object[]> countEmployeesByDepartment();

    @org.springframework.data.jpa.repository.Query("SELECT d.name, e.employmentTypeEnum, COUNT(e) FROM DepartmentEntity d JOIN d.employees e GROUP BY d.id, d.name, e.employmentTypeEnum")
    java.util.List<Object[]> countEmploymentTypesByDepartment();
}

