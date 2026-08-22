package com.ailms.repository;

import com.ailms.entity.QuestionOptionEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionOptionRepository extends BaseRepository<QuestionOptionEntity, Long> {
    List<QuestionOptionEntity> findByQuestionId(Long questionId);

    /** Lấy phương án theo đúng thứ tự hiển thị của câu hỏi. */
    List<QuestionOptionEntity> findByQuestionIdOrderByOrderIndexAsc(Long questionId);

    void deleteByQuestionId(Long questionId);
}
