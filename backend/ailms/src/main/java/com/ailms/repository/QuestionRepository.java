package com.ailms.repository;

import com.ailms.entity.QuestionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<QuestionEntity, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<QuestionEntity> {
    List<QuestionEntity> findByQuizId(Long quizId);
}
