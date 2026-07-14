package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "lesson_progress", uniqueConstraints = {
        @UniqueConstraint(name = "uk_lesson_progress_user_lesson_enrollment", columnNames = {"user_id", "lesson_id", "enrollment_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LessonProgressEntity extends BaseEntity {
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "lesson_id", nullable = false)
    private Long lessonId;

    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    @Column(name = "status")
    private Byte status;

    @Column(name = "progress_percent")
    private Integer progressPercent;

    @Column(name = "last_position_sec")
    private Integer lastPositionSec;

    @Column(name = "time_spent_sec")
    private Integer timeSpentSec;

    @Column(name = "attempt_count")
    private Integer attemptCount;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "last_accessed_at")
    private LocalDateTime lastAccessedAt;
}
