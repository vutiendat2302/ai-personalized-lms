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
@Table(name = "user_role")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class UserRoleEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private RoleEntity roleEntity;

    /** Id của user thực hiện gán (admin), null nếu do hệ thống tự gán lúc register. */
    @Column(name = "assigned_by")
    private Long assignedBy;

    @Column(name = "assigned_at")
    private LocalDateTime assigned_at;

    @Column(name = "expired_at")
    private LocalDateTime expired_at;

    /** Chỗ trống cho ABAC sau này: giới hạn role theo phạm vi, VD: courseId cụ thể. Để null = áp dụng toàn hệ thống. */
    @Column(name = "scope_type", length = 50)
    private String scopeType;

    @Column(name = "scope_id")
    private Long scopeId;
}
