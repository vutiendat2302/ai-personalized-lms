package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;

/**
 * Thực thể lưu trữ các lựa chọn / phương án đáp án cho từng câu hỏi trắc nghiệm.
 */
@Entity
@Table(name = "question_option", indexes = {
        @Index(name = "idx_question_option_question_id", columnList = "question_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionOptionEntity {

    /** Mã định danh phương án lựa chọn (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID câu hỏi chứa phương án đáp án này. */
    @Column(name = "question_id", nullable = false)
    private Long questionId;

    /** Nội dung hiển thị của phương án lựa chọn. */
    @Column(name = "content")
    private String content;

    /** Đánh dấu đây có phải là đáp án đúng hay không (true = đáp án đúng). */
    @Column(name = "is_correct")
    private Boolean isCorrect;

    /** Thứ tự hiển thị phương án lựa chọn trong câu hỏi. */
    @Column(name = "order_index")
    private Integer orderIndex;
}
