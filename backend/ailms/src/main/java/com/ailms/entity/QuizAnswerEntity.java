package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ chi tiết câu trả lời của học viên cho từng câu hỏi trong một lượt làm bài (QuizAttempt).
 */
@Entity
@Table(name = "quiz_answer", indexes = {
        @Index(name = "idx_quiz_answer_attempt_id", columnList = "attempt_id"),
        @Index(name = "idx_quiz_answer_question_id", columnList = "question_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAnswerEntity {

    /** Mã định danh câu trả lời (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID lượt làm bài (QuizAttempt) tương ứng. */
    @Column(name = "attempt_id", nullable = false)
    private Long attemptId;

    /** ID câu hỏi trong bài kiểm tra. */
    @Column(name = "question_id", nullable = false)
    private Long questionId;

    /** ID của phương án đáp án học viên chọn (đối với trắc nghiệm). */
    @Column(name = "selected_option_id")
    private Long selectedOptionId;

    /** Nội dung văn bản câu trả lời của học viên (đối với tự luận / điền từ). */
    @Column(name = "answer_text", columnDefinition = "TEXT")
    private String answerText;

    /** Kết quả đánh giá câu trả lời đúng hay sai (true = đúng, false = sai). */
    @Column(name = "is_correct")
    private Boolean isCorrect;

    /** Số điểm đạt được cho câu trả lời này. */
    @Column(name = "points_earned", precision = 5, scale = 2)
    private BigDecimal pointsEarned;

    /** Thời điểm ghi nhận câu trả lời. */
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
