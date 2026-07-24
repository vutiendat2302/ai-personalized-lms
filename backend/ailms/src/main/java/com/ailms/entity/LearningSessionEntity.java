package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.SessionStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Lưu trữ phiên học đang diễn ra hoặc lịch sử phiên học của học viên.
 */
@Entity
@Table(name = "learning_session", indexes = {
        @Index(name = "idx_learning_session_user_id", columnList = "user_id"),
        @Index(name = "idx_learning_session_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LearningSessionEntity extends BaseEntity {

    /** Mã định danh phiên học (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID học viên thực hiện phiên học. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Loại thực thể học tập (VD: LESSON, COURSE, QUIZ, ASSIGNMENT). */
    @Column(name = "entity_type", length = 50)
    private String entityType; // e.g., "LESSON", "COURSE", "QUIZ"

    /** ID tương ứng của thực thể học tập. */
    @Column(name = "entity_id")
    private Long entityId;

    /** Tổng số giây học viên thực sự tương tác/hoạt động trong phiên học này. */
    @Column(name = "active_seconds", nullable = false)
    @Builder.Default
    private int activeSeconds = 0;

    /** Trạng thái phiên học (ACTIVE, TIMEOUT, COMPLETED, CLOSED). */
    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SessionStatusEnum status = SessionStatusEnum.ACTIVE;

    /** Lý do kết thúc phiên học (VD: User Logout, Heartbeat Timeout, Page Close). */
    @Column(name = "close_reason", length = 255)
    private String closeReason;

    /** Thời điểm nhận tín hiệu duy trì phiên (Heartbeat) gần nhất từ frontend. */
    @Column(name = "last_heartbeat_at")
    private LocalDateTime lastHeartbeatAt;

    /** Thời điểm ghi nhận tương tác gần nhất của người dùng trong phiên. */
    @Column(name = "last_interaction_at")
    private LocalDateTime lastInteractionAt;
}
