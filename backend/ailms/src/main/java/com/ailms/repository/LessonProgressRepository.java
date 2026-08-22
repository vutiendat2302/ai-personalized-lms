package com.ailms.repository;

import com.ailms.entity.LessonProgressEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LessonProgressRepository extends BaseRepository<LessonProgressEntity, Long> {
    List<LessonProgressEntity> findByUserId(Long userId);
    List<LessonProgressEntity> findByLessonId(Long lessonId);
    List<LessonProgressEntity> findByEnrollmentId(Long enrollmentId);
    Optional<LessonProgressEntity> findByUserIdAndLessonIdAndEnrollmentId(Long userId, Long lessonId, Long enrollmentId);
    List<LessonProgressEntity> findByEnrollmentIdAndLessonIdIn(Long enrollmentId, List<Long> lessonIds);
    long countByEnrollmentIdAndStatusEquals(Long enrollmentId, Byte status); // status=1 là COMPLETED
}
