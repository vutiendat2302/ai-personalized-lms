package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AuditLogEntity extends BaseEntity{

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /**
     * Người thực hiện hành động (có thể null nếu là hệ thống).
     * Liên kết mềm đến UserEntity, không bắt buộc khóa ngoại cứng.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    /** Hành động: CREATE, UPDATE, DELETE, LOGIN, LOGIN_FAILED, LOGOUT, GRANT_ROLE, REVOKE_ROLE... */
    @Column(name = "action", length = 50)
    private String action;

    /** Loại đối tượng bị tác động: user, role, permission, course, enrollment, salary... */
    @Column(name = "entity_type", length = 100)
    private String entityType;

    /** ID của bản ghi bị tác động trong entity_type tương ứng. */
    @Column(name = "entity_id")
    private Long entityId;

    /** Dữ liệu trước thay đổi (JSON), null nếu là INSERT. */
    @Column(name = "old_value", columnDefinition = "json")
    private String oldValue;

    /** Dữ liệu sau thay đổi (JSON), null nếu là DELETE. */
    @Column(name = "new_value", columnDefinition = "json")
    private String newValue;

    /**
     * Địa chỉ IP của client thực hiện yêu cầu.
     */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /**
     * Thông tin User-Agent của client.
     * Dùng để xác định trình duyệt, hệ điều hành
     * hoặc thiết bị gửi request.
     */
    @Column(name = "user_agent")
    private String userAgent;

    /**
     * Thời điểm hành động xảy ra.
     * Có thể sử dụng để truy vết lịch sử thao tác,
     * phục vụ kiểm toán (Audit) và điều tra sự cố.
     */
    @Column(name = "occurred_at")
    private LocalDateTime occurredAt;
}
