package com.ailms.repository;

import com.ailms.entity.LessonProgressEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LessonProgressRepository extends JpaRepository<LessonProgressEntity, Long> {
    List<LessonProgressEntity> findByUserId(Long userId);
    List<LessonProgressEntity> findByLessonId(Long lessonId);
    List<LessonProgressEntity> findByEnrollmentId(Long enrollmentId);
}
