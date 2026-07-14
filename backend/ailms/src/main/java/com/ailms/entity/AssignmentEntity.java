package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "assignment", indexes = {
        @Index(name = "idx_assignment_lesson_id", columnList = "lesson_id"),
        @Index(name = "idx_assignment_course_id", columnList = "course_id"),
        @Index(name = "idx_assignment_section_id", columnList = "section_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AssignmentEntity extends BaseEntity {
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

    @Column(name = "title")
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "max_score", precision = 5, scale = 2)
    private BigDecimal maxScore;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "allow_late")
    private Boolean allowLate;

    @Column(name = "status")
    private Byte status;
}
