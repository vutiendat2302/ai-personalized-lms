package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "assignment_id", nullable = false)
    private Long assignmentId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    @Column(name = "content_text", columnDefinition = "TEXT")
    private String contentText;

    @Column(name = "file_url")
    private String fileUrl;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_metadata_id")
    private FileMetadataEntity fileMetadata;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "is_late")
    private Boolean isLate;

    @Column(name = "score", precision = 5, scale = 2)
    private BigDecimal score;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "graded_by")
    private Long gradedBy;

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    @Column(name = "status")
    private Byte status;
}
