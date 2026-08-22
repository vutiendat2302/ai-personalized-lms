package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ nhật ký ghi nhận các hành vi học tập chi tiết của học viên (click, play video, nộp bài, xem tài liệu...).
 */
@Entity
@Table(name = "learning_activity_log", indexes = {
        @Index(name = "idx_learning_activity_user_id", columnList = "user_id"),
        @Index(name = "idx_learning_activity_user_occurred", columnList = "user_id, occurred_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearningActivityLogEntity {

    /** Mã định danh nhật ký hành vi (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID học viên thực hiện hành vi. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Loại sự kiện / hành vi (VD: VIDEO_PAUSE, QUIZ_SUBMIT, RESOURCE_DOWNLOAD). */
    @Column(name = "event_type")
    private String eventType;

    /** Loại thực thể tương tác (VD: LESSON, QUIZ, RESOURCE). */
    @Column(name = "entity_type")
    private String entityType;

    /** ID của thực thể tương tác. */
    @Column(name = "entity_id")
    private Long entityId;

    /** Thông tin bổ sung dạng JSON (chứa thông số kỹ thuật, vị trí video, câu trả lời...). */
    @Column(name = "metadata", columnDefinition = "json")
    private String metadata;

    /** Thông tin thiết bị và trình duyệt người dùng (VD: Chrome 120/Windows, Mobile App). */
    @Column(name = "device")
    private String device;

    /** Thời điểm diễn ra sự kiện hành vi. */
    @Column(name = "occurred_at")
    private LocalDateTime occurredAt;
}
