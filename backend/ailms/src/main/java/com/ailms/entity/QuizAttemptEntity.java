package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "quiz_attempt", uniqueConstraints = {
        @UniqueConstraint(name = "uk_quiz_attempt_quiz_user_attempt", columnNames = {"quiz_id", "user_id", "attempt_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class QuizAttemptEntity extends BaseEntity {
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "quiz_id", nullable = false)
    private Long quizId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    @Column(name = "attempt_number")
    private Integer attemptNumber;

    @Column(name = "score", precision = 5, scale = 2)
    private BigDecimal score;

    @Column(name = "is_passed")
    private Boolean isPassed;

    @Column(name = "status")
    private Byte status;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "time_spent_sec")
    private Integer timeSpentSec;
}
