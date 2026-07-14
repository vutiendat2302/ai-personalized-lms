package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "course_progress")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CourseProgressEntity extends BaseEntity {
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    @Column(name = "total_section")
    private Integer totalSection;

    @Column(name = "total_lessons")
    private Integer totalLessons;

    @Column(name = "completed_lessons")
    private Integer completedLessons;

    @Column(name = "progress_percent")
    private Integer progressPercent;

    @Column(name = "avg_quiz_score", precision = 5, scale = 2)
    private BigDecimal avgQuizScore;

    @Column(name = "completed_assignments")
    private Integer completedAssignments;

    @Column(name = "last_lesson_id")
    private Long lastLessonId;

    @Column(name = "last_accessed_at")
    private LocalDateTime lastAccessedAt;
}
