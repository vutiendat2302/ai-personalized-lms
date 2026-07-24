package com.ailms.repository;

import com.ailms.entity.QuizEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizRepository extends BaseRepository<QuizEntity, Long> {
    List<QuizEntity> findByLessonId(Long lessonId);

    List<QuizEntity> findByCourseId(Long courseId);

    List<QuizEntity> findBySectionId(Long sectionId);
}
