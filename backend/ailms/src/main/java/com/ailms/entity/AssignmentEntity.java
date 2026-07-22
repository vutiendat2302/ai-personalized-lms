package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ thông tin bài tập tự luận (Assignment) của bài học hoặc chương học.
 */
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

    /** Mã định danh bài tập (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID bài học chứa bài tập (nếu có). */
    @Column(name = "lesson_id")
    private Long lessonId;

    /** ID khóa học chứa bài tập. */
    @Column(name = "course_id")
    private Long courseId;

    /** ID chương học chứa bài tập. */
    @Column(name = "section_id")
    private Long sectionId;

    /** Tiêu đề bài tập tự luận. */
    @Column(name = "title")
    private String title;

    /** Yêu cầu và hướng dẫn chi tiết làm bài tập. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Điểm số tối đa của bài tập (VD: 10.00 hoặc 100.00). */
    @Column(name = "max_score", precision = 5, scale = 2)
    private BigDecimal maxScore;

    /** Hạn chót nộp bài tập (Deadline). */
    @Column(name = "due_date")
    private LocalDateTime dueDate;

    /** Cho phép nộp bài trễ hạn hay không (true = cho phép, false = không). */
    @Column(name = "allow_late")
    private Boolean allowLate;

    /** Trạng thái bài tập (DRAFT, PUBLISHED, ARCHIVED). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.DRAFT;
}
