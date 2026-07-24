package com.ailms.repository;

import com.ailms.entity.TeacherCategoryEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeacherCategoryRepository extends JpaRepository<TeacherCategoryEntity, Long>, JpaSpecificationExecutor<TeacherCategoryEntity> {

    List<TeacherCategoryEntity> findByEmployee_UserId(Long employeeId);

    List<TeacherCategoryEntity> findByEmployee_UserIdAndStatus(Long employeeId, BaseStatusEnum status);

    List<TeacherCategoryEntity> findByCategory_IdAndStatus(Long categoryId, BaseStatusEnum status);

    Optional<TeacherCategoryEntity> findByEmployee_UserIdAndCategory_Id(Long employeeId, Long categoryId);

    boolean existsByEmployee_UserIdAndCategory_Id(Long employeeId, Long categoryId);

    boolean existsByEmployee_UserIdAndCategory_IdAndStatus(Long employeeId, Long categoryId, BaseStatusEnum status);
}
