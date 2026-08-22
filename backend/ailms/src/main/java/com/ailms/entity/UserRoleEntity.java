package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Liên kết giữa User và Role.
 * Hỗ trợ:
 * - Một user có nhiều role.
 * - Theo dõi ai đã gán role và thời điểm gán.
 * - Có thể đặt thời hạn cho role.
 * - Hỗ trợ mở rộng ABAC thông qua scopeType và scopeId.
 */

@Entity
@Table(name = "user_role")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class UserRoleEntity extends BaseEntity {

    /** ID duy nhất được sinh bằng thuật toán Snowflake. */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Người dùng được gán vai trò. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    /** Vai trò được gán cho người dùng. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private RoleEntity roleEntity;

    /** ID của người dùng thực hiện gán (Admin), null nếu hệ thống tự gán khi đăng ký. */
    @Column(name = "assigned_by")
    private Long assignedBy;

    /** Thời điểm gán vai trò. */
    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    /** Thời điểm vai trò hết hiệu lực (nếu có hạn). */
    @Column(name = "expired_at")
    private LocalDateTime expiredAt;

    /** Phạm vi áp dụng ABAC (VD: COURSE, DEPARTMENT, CLASS). Để null = áp dụng toàn hệ thống. */
    @Column(name = "scope_type", length = 50)
    private String scopeType;

    /** ID của đối tượng thuộc phạm vi áp dụng ABAC tương ứng. */
    @Column(name = "scope_id")
    private Long scopeId;
}
