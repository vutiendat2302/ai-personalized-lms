package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(name = "quiz", indexes = {
        @Index(name = "idx_quiz_lesson_id", columnList = "lesson_id"),
        @Index(name = "idx_quiz_course_id", columnList = "course_id"),
        @Index(name = "idx_quiz_section_id", columnList = "section_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class QuizEntity extends BaseEntity {
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "lesson_id")
    private Long lessonId;

    @Column(name = "course_id")
    private Long courseId;

    @Column(name = "section_id")
    private Long sectionId;

    @Column(name = "code")
    private String code;

    @Column(name = "title")
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "time_limit_min")
    private Integer timeLimitMin;

    @Column(name = "pass_score", precision = 5, scale = 2)
    private BigDecimal passScore;

    @Column(name = "max_attempts")
    private Integer maxAttempts;

    @Column(name = "shuffle_questions")
    private Boolean shuffleQuestions;

    @Column(name = "status")
    private Byte status;
}
