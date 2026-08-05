package com.ailms.repository;

import com.ailms.entity.QuestionEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepository extends BaseRepository<QuestionEntity, Long> {
    List<QuestionEntity> findByQuizId(Long quizId);

    void deleteByQuizId(Long quizId);
}
