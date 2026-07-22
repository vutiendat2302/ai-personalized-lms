package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ danh sách học viên chờ vào lớp học khi lớp đã đầy sĩ số (Max Members).
 */
@Entity
@Table(name = "waitlist", indexes = {
        @Index(name = "idx_waitlist_class_id", columnList = "class_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WaitlistEntity extends BaseEntity {

    /** Mã định danh hàng chờ (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID lớp học mà học viên đang đăng ký chờ. */
    @Column(name = "class_id", nullable = false)
    private Long classId;

    /** ID học viên yêu cầu vào danh sách chờ. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Thời điểm đăng ký xin vào danh sách chờ. */
    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    /** Trạng thái yêu cầu chờ (PENDING, ENROLLED, CANCELLED, EXPIRED). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.PENDING;
}
