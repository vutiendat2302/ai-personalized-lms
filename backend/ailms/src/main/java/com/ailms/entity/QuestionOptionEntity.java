package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;

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
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "content")
    private String content;

    @Column(name = "is_correct")
    private Boolean isCorrect;

    @Column(name = "order_index")
    private Integer orderIndex;
}
