package com.ailms.entity;


import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Đại diện cho một quyền hạn (Permission) chi tiết trong hệ thống RBAC/ABAC.
 * Định nghĩa đối tượng (entity) và hành động (action) tương ứng.
 */
@Entity
@Table(name = "permission", indexes = {
        @Index(name = "idx_permissions_name", columnList = "name", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PermissionEntity extends BaseEntity {

    /** Mã định danh quyền hạn (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /**
     * Tên quyền định dạng "resource:action", VD: "course:create", "course:read",
     * "course:update:own" (hỗ trợ hậu tố cho ABAC scope).
     */
    @Column(name = "name", nullable = false, unique = true, length = 50)
    private String name;

    /** Mã định danh hiển thị của quyền hạn trong hệ thống. */
    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    /** Tên thực thể hoặc tài nguyên mà quyền hạn áp dụng (VD: course, user, lesson). */
    @Column(name = "entity", nullable = false, length = 50)
    private String entity;

    /** Hành động được phép thực hiện trên thực thể (VD: create, read, update, delete, approve). */
    @Column(name = "action", nullable = false, length = 50)
    private String action;

    /** Mô tả chi tiết mục đích và scope của quyền hạn. */
    @Column(name = "description")
    private String description;
}
