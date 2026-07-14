package com.ailms.repository;

import com.ailms.entity.StudyGoalEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudyGoalRepository extends JpaRepository<StudyGoalEntity, Long> {
    List<StudyGoalEntity> findByUserId(Long userId);
    List<StudyGoalEntity> findByCourseId(Long courseId);
}
