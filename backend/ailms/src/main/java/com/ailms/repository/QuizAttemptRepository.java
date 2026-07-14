package com.ailms.repository;

import com.ailms.entity.QuizAttemptEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttemptEntity, Long> {
    List<QuizAttemptEntity> findByQuizId(Long quizId);
    List<QuizAttemptEntity> findByUserId(Long userId);
    List<QuizAttemptEntity> findByEnrollmentId(Long enrollmentId);
}
