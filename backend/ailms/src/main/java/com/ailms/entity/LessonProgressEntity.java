package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ tiến độ học tập chi tiết của học viên đối với từng bài học (Lesson).
 */
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

    /** Mã định danh tiến độ bài học (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID học viên thực hiện bài học. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** ID bài học tương ứng. */
    @Column(name = "lesson_id", nullable = false)
    private Long lessonId;

    /** ID lượt ghi danh khóa học (Enrollment). */
    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    /** Trạng thái tiến độ bài học (0 = IN_PROGRESS, 1 = COMPLETED). */
    @Column(name = "status")
    private Byte status;

    /** Tỷ lệ phần trăm hoàn thành bài học (0 - 100%). */
    @Column(name = "progress_percent")
    private Integer progressPercent;

    /** Vị trí thời gian dừng lại gần nhất khi xem video/bài học (tính bằng giây). */
    @Column(name = "last_position_sec")
    private Integer lastPositionSec;

    /** Tổng thời gian học viên đã dành để học bài này (tính bằng giây). */
    @Column(name = "time_spent_sec")
    private Integer timeSpentSec;

    /** Số lần học viên mở/học bài học này. */
    @Column(name = "attempt_count")
    private Integer attemptCount;

    /** Ghi chú riêng của học viên cho bài học. */
    @Column(name = "personal_note", columnDefinition = "TEXT")
    private String personalNote;

    /** Thời điểm bắt đầu học bài học. */
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    /** Thời điểm hoàn thành bài học. */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /** Thời điểm gần nhất học viên mở bài học. */
    @Column(name = "last_accessed_at")
    private LocalDateTime lastAccessedAt;
}
