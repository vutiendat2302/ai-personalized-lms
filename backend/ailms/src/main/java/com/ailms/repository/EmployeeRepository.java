package com.ailms.repository;

import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends BaseRepository<EmployeeEntity, Long> {
    Optional<EmployeeEntity> findByEmployeeCode(String employeeCode);

    boolean existsByEmployeeCode(String employeeCode);

    boolean existsByDepartment_Id(Long departmentId);
    boolean existsByDepartment_IdAndUserEntity_StatusNot(Long departmentId, UserStatusEnum status);

    List<EmployeeEntity> findByDepartment_Id(Long departmentId);

    List<EmployeeEntity> findByStatus(EmployeeStatusEnum status);

    List<EmployeeEntity> findAllByStatusNot(EmployeeStatusEnum status);

    @Query("SELECT e.status, COUNT(e) FROM EmployeeEntity e" +
            " WHERE e.userEntity.status <> :userDeletedStatus GROUP BY e.status")
    List<Object[]> countEmployeesGroupByStatus(@Param("userDeletedStatus") UserStatusEnum userDeletedStatus);

    @Query("SELECT COALESCE(d.name, 'Chưa phân chia'), COUNT(e) FROM EmployeeEntity e LEFT JOIN e.department d WHERE e.userEntity.status != :status GROUP BY d.name")
    List<Object[]> countEmployeesGroupByDepartment(@Param("status") UserStatusEnum status);

    @Query("SELECT COALESCE(d.name, 'Chưa phân chia'), COUNT(e) FROM EmployeeEntity e LEFT JOIN e.department d " +
            "WHERE e.userEntity.status != :status " +
            "AND (e.startDate IS NULL OR e.startDate <= :endOfYear) " +
            "AND (e.endDate IS NULL OR e.endDate >= :startOfYear) " +
            "GROUP BY d.name")
    List<Object[]> countEmployeesGroupByDepartmentInYear(
            @Param("status") UserStatusEnum status,
            @Param("startOfYear") LocalDateTime startOfYear,
            @Param("endOfYear") LocalDateTime endOfYear);

    @Query("SELECT e.employmentTypeEnum, COUNT(e) FROM EmployeeEntity e WHERE e.userEntity.status != :status GROUP BY e.employmentTypeEnum")
    List<Object[]> countEmployeesGroupByEmploymentType(@Param("status") UserStatusEnum status);

    @Query("SELECT e.employmentTypeEnum, COUNT(e) FROM EmployeeEntity e " +
            "WHERE e.userEntity.status != :status " +
            "AND (e.startDate IS NULL OR e.startDate <= :endOfYear) " +
            "AND (e.endDate IS NULL OR e.endDate >= :startOfYear) " +
            "GROUP BY e.employmentTypeEnum")
    List<Object[]> countEmployeesGroupByEmploymentTypeInYear(
            @Param("status") UserStatusEnum status,
            @Param("startOfYear") LocalDateTime startOfYear,
            @Param("endOfYear") LocalDateTime endOfYear);

    @Query("SELECT e.userEntity.gender, COUNT(e) FROM EmployeeEntity e WHERE e.userEntity.status != :status GROUP BY e.userEntity.gender")
    List<Object[]> countEmployeesGroupByGender(@Param("status") UserStatusEnum status);

    @Query("SELECT e.userEntity.gender, COUNT(e) FROM EmployeeEntity e " +
            "WHERE e.userEntity.status != :status " +
            "AND (e.startDate IS NULL OR e.startDate <= :endOfYear) " +
            "AND (e.endDate IS NULL OR e.endDate >= :startOfYear) " +
            "GROUP BY e.userEntity.gender")
    List<Object[]> countEmployeesGroupByGenderInYear(
            @Param("status") UserStatusEnum status,
            @Param("startOfYear") LocalDateTime startOfYear,
            @Param("endOfYear") LocalDateTime endOfYear);

    @Query("SELECT e FROM EmployeeEntity e " +
            "WHERE e.userEntity.status != :status " +
            "AND (e.startDate IS NULL OR e.startDate <= :endOfYear) " +
            "AND (e.endDate IS NULL OR e.endDate >= :startOfYear)")
    List<EmployeeEntity> findAllActiveInYear(
            @Param("status") UserStatusEnum status,
            @Param("startOfYear") LocalDateTime startOfYear,
            @Param("endOfYear") LocalDateTime endOfYear);

    long countByUserEntity_StatusNot(UserStatusEnum userStatusEnum);

    List<EmployeeEntity> findAllByUserEntity_StatusNot(UserStatusEnum userStatusEnum);

    List<EmployeeEntity> findAllByUserEntity_Status(UserStatusEnum userStatusEnum);
}


