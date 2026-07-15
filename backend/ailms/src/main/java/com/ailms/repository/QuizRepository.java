package com.ailms.repository;

import com.ailms.entity.QuizEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizRepository extends JpaRepository<QuizEntity, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<QuizEntity> {
    List<QuizEntity> findByLessonId(Long lessonId);
    List<QuizEntity> findByCourseId(Long courseId);
    List<QuizEntity> findBySectionId(Long sectionId);
}
