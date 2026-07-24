package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ bài nộp tự luận của học viên cho một bài tập (Assignment), bao gồm kết quả chấm điểm và nhận xét của giảng viên.
 */
@Entity
@Table(name = "submission", indexes = {
        @Index(name = "idx_submission_assignment_id", columnList = "assignment_id"),
        @Index(name = "idx_submission_user_id", columnList = "user_id"),
        @Index(name = "idx_submission_enrollment_id", columnList = "enrollment_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SubmissionEntity extends BaseEntity {

    /** Mã định danh bài nộp (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID bài tập tương ứng. */
    @Column(name = "assignment_id", nullable = false)
    private Long assignmentId;

    /** ID học viên nộp bài. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** ID lượt ghi danh khóa học (Enrollment). */
    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    /** Nội dung bài làm dạng văn bản của học viên. */
    @Column(name = "content_text", columnDefinition = "TEXT")
    private String contentText;

    /** Đường dẫn URL file đính kèm bài làm (MinIO). */
    @Column(name = "file_url")
    private String fileUrl;

    /** Metadata chi tiết của file bài làm đính kèm. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_metadata_id")
    private FileMetadataEntity fileMetadata;

    /** Thời điểm học viên nộp bài. */
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    /** Đánh dấu bài nộp bị nộp muộn sau deadline (true = trễ hạn). */
    @Column(name = "is_late")
    private Boolean isLate;

    /** Điểm số giảng viên đã chấm cho bài nộp. */
    @Column(name = "score", precision = 5, scale = 2)
    private BigDecimal score;

    /** Nhận xét và góp ý chi tiết của giảng viên cho học viên. */
    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    /** ID giảng viên/trợ giảng thực hiện chấm bài. */
    @Column(name = "graded_by")
    private Long gradedBy;

    /** Thời điểm hoàn tất chấm bài và trả điểm. */
    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    /** Trạng thái bài nộp (0 = SUBMITTED, 1 = GRADED, 2 = REJECTED). */
    @Column(name = "status")
    private Byte status;
}
