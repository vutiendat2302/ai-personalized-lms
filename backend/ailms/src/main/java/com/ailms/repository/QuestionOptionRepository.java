package com.ailms.repository;

import com.ailms.entity.QuestionOptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionOptionRepository extends JpaRepository<QuestionOptionEntity, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<QuestionOptionEntity> {
    List<QuestionOptionEntity> findByQuestionId(Long questionId);
}
