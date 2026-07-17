package com.ailms.repository;

import com.ailms.entity.QuizAttemptEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizAttemptRepository extends BaseRepository<QuizAttemptEntity, Long> {
    List<QuizAttemptEntity> findByQuizId(Long quizId);

    List<QuizAttemptEntity> findByUserId(Long userId);

    List<QuizAttemptEntity> findByEnrollmentId(Long enrollmentId);
}
