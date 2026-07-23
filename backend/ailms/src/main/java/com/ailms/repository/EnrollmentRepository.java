package com.ailms.repository;

import com.ailms.entity.EnrollmentEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EnrollmentRepository extends BaseRepository<EnrollmentEntity, Long> {
    List<EnrollmentEntity> findByUserEntity_Id(Long userId);
    List<EnrollmentEntity> findByCourseEntity_Id(Long courseId);
    List<EnrollmentEntity> findByClassEntity_Id(Long classId);
    long countByCourseEntity_Id(Long courseId);
    java.util.Optional<EnrollmentEntity> findByUserEntity_IdAndCourseEntity_Id(Long userId, Long courseId);
}
