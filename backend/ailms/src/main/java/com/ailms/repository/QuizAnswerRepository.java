package com.ailms.repository;

import com.ailms.entity.QuizAnswerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizAnswerRepository extends JpaRepository<QuizAnswerEntity, Long> {
    List<QuizAnswerEntity> findByAttemptId(Long attemptId);
    List<QuizAnswerEntity> findByQuestionId(Long questionId);
}
