package com.ailms.repository;

import com.ailms.entity.CoursePackageEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface CoursePackageRepository extends BaseRepository<CoursePackageEntity, Long> {
    List<CoursePackageEntity> findByCourseEntity_Id(Long courseId);

    boolean existsByClassEntity_Id(Long classId);

    boolean existsByClassEntity_IdAndIdNot(Long classId, Long packageId);

    @Modifying
    @Query("UPDATE CoursePackageEntity p SET p.status = CoursePackageStatusEnum.INACTIVE WHERE p.courseEntity.id = :courseId")
    void deactivateAllByCourseId(@Param("courseId") Long courseId);
}
