package com.ailms.repository;

import com.ailms.entity.EnrollmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EnrollmentRepository extends JpaRepository<EnrollmentEntity, Long> {
    List<EnrollmentEntity> findByUserEntity_Id(Long userId);
    List<EnrollmentEntity> findByCourseEntity_Id(Long courseId);
    List<EnrollmentEntity> findByClassEntity_Id(Long classId);
}
