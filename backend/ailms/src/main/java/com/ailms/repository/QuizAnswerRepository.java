package com.ailms.repository;

import com.ailms.entity.QuizAnswerEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizAnswerRepository extends BaseRepository<QuizAnswerEntity, Long> {
    List<QuizAnswerEntity> findByAttemptId(Long attemptId);

    List<QuizAnswerEntity> findByQuestionId(Long questionId);
}
