package com.ailms.repository;

import com.ailms.entity.QuizAnswerEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizAnswerRepository extends BaseRepository<QuizAnswerEntity, Long> {
    List<QuizAnswerEntity> findByAttemptId(Long attemptId);

    List<QuizAnswerEntity> findByQuestionId(Long questionId);

    /** Lấy toàn bộ câu trả lời của nhiều lượt làm để dựng hàng đợi chấm tay. */
    List<QuizAnswerEntity> findByAttemptIdIn(List<Long> attemptIds);

    /** Lấy toàn bộ câu trả lời của nhiều câu hỏi để tính tỷ lệ sai. */
    List<QuizAnswerEntity> findByQuestionIdIn(List<Long> questionIds);
}
