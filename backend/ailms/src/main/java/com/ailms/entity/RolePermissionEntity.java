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
 * Liên kết giữa Role và Permission.
 * Mỗi bản ghi biểu diễn một Permission được gán cho một Role.
 * Cặp (role_id, permission_id) là duy nhất, tránh gán trùng Permission cho cùng một Role.
 */

@Entity
@Table(name = "role_permission", uniqueConstraints = {
        @UniqueConstraint(name = "uk_role_permission", columnNames = {"role_id", "permission_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RolePermissionEntity extends BaseEntity {

    /** Mã định danh bản ghi liên kết Role - Permission (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Vai trò được cấp quyền. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private RoleEntity roleEntity;

    /** Quyền hạn được gán cho vai trò. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "permission_id", nullable = false)
    private PermissionEntity permissionEntity;

    /** ID của Admin thực hiện gán quyền này cho Role. */
    @Column(name = "granted_by")
    private Long grantedBy;

    /** Thời điểm gán quyền cho Role. */
    @Column(name = "granted_at")
    private LocalDateTime grantedAt;
}
