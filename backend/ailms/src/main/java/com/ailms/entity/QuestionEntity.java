package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

/**
 * Thực thể lưu trữ câu hỏi trong bài kiểm tra trắc nghiệm (Quiz).
 */
@Entity
@Table(name = "question", indexes = {
        @Index(name = "idx_question_quiz_id", columnList = "quiz_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class QuestionEntity extends BaseEntity {

    /** Mã định danh câu hỏi (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID bài kiểm tra (Quiz) chứa câu hỏi này. */
    @Column(name = "quiz_id", nullable = false)
    private Long quizId;

    /** Nội dung câu hỏi (hỗ trợ định dạng văn bản / HTML / Markdown). */
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    /** Phân loại dạng câu hỏi (1 = Single Choice, 2 = Multiple Choice, 3 = True/False, 4 = Essay). */
    @Column(name = "question_type")
    private Byte questionType;

    /** Điểm số đạt được khi trả lời đúng câu hỏi này. */
    @Column(name = "points", precision = 5, scale = 2)
    private BigDecimal points;

    /** Thứ tự hiển thị của câu hỏi trong bài kiểm tra. */
    @Column(name = "order_index")
    private Integer orderIndex;

    /** Lời giải thích và đáp án chi tiết cho câu hỏi. */
    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    /** Trạng thái câu hỏi (1 = Active, 0 = Inactive). */
    @Column(name = "status")
    private Byte status;
}
