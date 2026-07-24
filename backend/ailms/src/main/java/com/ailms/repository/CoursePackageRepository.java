package com.ailms.repository;

import com.ailms.entity.CoursePackageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CoursePackageRepository extends JpaRepository<CoursePackageEntity, Long>, JpaSpecificationExecutor<CoursePackageEntity> {
    List<CoursePackageEntity> findByCourseEntity_Id(Long courseId);
}
