package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Lưu trữ tiến độ học tập của học viên đối với một khóa học,
 * bao gồm tỷ lệ hoàn thành, kết quả đánh giá và thông tin
 * bài học được truy cập gần nhất.
 */

@Entity
@Table(name = "course_progress")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CourseProgressEntity extends BaseEntity {

    /** Mã định danh tiến độ khóa học (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID học viên thực hiện học tập. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** ID khóa học tương ứng. */
    @Column(name = "course_id", nullable = false)
    private Long courseId;

    /** ID lượt đăng ký ghi danh (Enrollment) tương ứng. */
    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    /** Tổng số chương/phần học trong khóa học. */
    @Column(name = "total_section")
    private Integer totalSection;

    /** Tổng số bài học có trong khóa học. */
    @Column(name = "total_lessons")
    private Integer totalLessons;

    /** Số lượng bài học mà học viên đã hoàn thành. */
    @Column(name = "completed_lessons")
    private Integer completedLessons;

    /** Tỷ lệ hoàn thành tổng thể của khóa học (phần trăm 0 - 100%). */
    @Column(name = "progress_percent")
    private Integer progressPercent;

    /** Điểm trung bình các bài kiểm tra trắc nghiệm (Quiz) thuộc khóa học. */
    @Column(name = "avg_quiz_score", precision = 5, scale = 2)
    private BigDecimal avgQuizScore;

    /** Số bài tập tự luận (Assignment) học viên đã nộp và được chấm. */
    @Column(name = "completed_assignments")
    private Integer completedAssignments;

    /** ID bài học được học viên truy cập gần nhất. */
    @Column(name = "last_lesson_id")
    private Long lastLessonId;

    /** Thời điểm gần nhất học viên truy cập học khóa học này. */
    @Column(name = "last_accessed_at")
    private LocalDateTime lastAccessedAt;
}
