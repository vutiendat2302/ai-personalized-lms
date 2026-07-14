package com.ailms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "course_teacher", indexes = {
        @Index(name = "idx_course_teacher_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CourseTeacherEntity {

    @EmbeddedId
    private CourseTeacherId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("courseId")
    @JoinColumn(name = "course_id", nullable = false)
    private CourseEntity courseEntity;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "assigned_by")
    private Long assignedBy;
}
