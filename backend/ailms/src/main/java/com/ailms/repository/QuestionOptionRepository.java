package com.ailms.repository;

import com.ailms.entity.QuestionOptionEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionOptionRepository extends BaseRepository<QuestionOptionEntity, Long> {
    List<QuestionOptionEntity> findByQuestionId(Long questionId);
}
