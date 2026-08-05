package com.ailms.entity;

import com.ailms.entity.enums.CourseTeacherStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Thực thể liên kết giữa khóa học và giảng viên phụ trách giảng dạy / đồng soạn thảo nội dung.
 */
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

    /** Khóa phức hợp chứa courseId và userId của giảng viên. */
    @EmbeddedId
    private CourseTeacherId id;

    /** Khóa học được phân công. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("courseId")
    @JoinColumn(name = "course_id", nullable = false)
    private CourseEntity courseEntity;

    /** Giảng viên được phân công. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    /** Thời điểm phân công giảng viên vào khóa học. */
    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    /** ID của Admin thực hiện phân công giảng viên. */
    @Column(name = "assigned_by")
    private Long assignedBy;

    /** Trạng thái phân công giảng viên (PENDING, ACTIVE, REJECTED, INACTIVE). */
    @Column(name = "status", length = 50)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CourseTeacherStatusEnum status = CourseTeacherStatusEnum.ACTIVE;
}
