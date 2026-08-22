package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ thông tin lượt làm bài kiểm tra trắc nghiệm của học viên (mỗi lượt làm bài là 1 bản ghi).
 */
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

    /** Mã định danh lượt làm bài (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID bài kiểm tra (Quiz) tương ứng. */
    @Column(name = "quiz_id", nullable = false)
    private Long quizId;

    /** ID học viên thực hiện làm bài. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** ID lượt ghi danh khóa học (Enrollment). */
    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    /** Thứ tự lượt làm bài của học viên đối với Quiz này (lần 1, lần 2, lần 3...). */
    @Column(name = "attempt_number")
    private Integer attemptNumber;

    /** Điểm số tổng kết lượt làm bài. */
    @Column(name = "score", precision = 5, scale = 2)
    private BigDecimal score;

    /** Đánh dấu lượt làm bài có đạt / đỗ hay không (true = PASSED, false = FAILED). */
    @Column(name = "is_passed")
    private Boolean isPassed;

    /** Trạng thái lượt làm bài (0 = IN_PROGRESS, 1 = SUBMITTED, 2 = TIMED_OUT, 3 = CANCELLED). */
    @Column(name = "status")
    private Byte status;

    /** Thời điểm bắt đầu ấn làm bài. */
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    /** Thời điểm hoàn thành và nộp bài. */
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    /** Tổng thời gian làm bài thực tế (tính bằng giây). */
    @Column(name = "time_spent_sec")
    private Integer timeSpentSec;
}
