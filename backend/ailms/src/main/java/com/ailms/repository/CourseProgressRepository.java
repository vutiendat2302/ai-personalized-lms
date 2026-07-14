package com.ailms.repository;

import com.ailms.entity.CourseProgressEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseProgressRepository extends JpaRepository<CourseProgressEntity, Long> {
    List<CourseProgressEntity> findByUserId(Long userId);
    List<CourseProgressEntity> findByCourseId(Long courseId);
    List<CourseProgressEntity> findByEnrollmentId(Long enrollmentId);
}
