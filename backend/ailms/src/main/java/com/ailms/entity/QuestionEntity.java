package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

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
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "quiz_id", nullable = false)
    private Long quizId;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "question_type")
    private Byte questionType;

    @Column(name = "points", precision = 5, scale = 2)
    private BigDecimal points;

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "status")
    private Byte status;
}
