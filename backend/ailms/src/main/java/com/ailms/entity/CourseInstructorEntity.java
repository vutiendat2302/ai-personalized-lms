package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.CourseInstructorStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "course_instructor", indexes = {
        @Index(name = "idx_ci_course_id", columnList = "course_id"),
        @Index(name = "idx_ci_instructor_id", columnList = "instructor_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CourseInstructorEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "instructor_id", nullable = false)
    private Long instructorId;

    @Column(name = "status", length = 30, nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CourseInstructorStatusEnum status = CourseInstructorStatusEnum.PENDING;

    @Column(name = "invited_by", nullable = false)
    private Long invitedBy;

    @Column(name = "invited_at", nullable = false)
    private LocalDateTime invitedAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;
}
