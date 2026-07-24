package com.ailms.entity;


import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;

/**
 * Đại diện cho một Role trong hệ thống.
 * Mỗi Role gồm:
 * - Thông tin cơ bản (name, code, description).
 * - Danh sách Permission được gán.
 * - Đánh dấu role hệ thống để tránh bị xóa hoặc chỉnh sửa ngoài ý muốn.
 */
@Entity
@Table(name = "role", indexes = {
        @Index(name = "idx_roles_name", columnList = "name", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RoleEntity extends BaseEntity {

    /** Mã định danh vai trò (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Tên hiển thị của role (VD: Quan tri vien, Giang vien). */
    @Column(name = "name", nullable = false, unique = true, length = 50)
    private String name;

    /** Mã định danh vai trò dạng chữ hoa không dấu (VD: ADMIN, INSTRUCTOR, TEACHER, STUDENT). */
    @Column(name = "code", nullable = false, unique = true, length = 30)
    private String code;

    /** Mô tả chức năng và mục đích của vai trò. */
    @Column(name = "description")
    private String description;

    /** Role hệ thống (seed sẵn) thì không cho xóa, VD: ADMIN. */
    @Column(name = "is_system", nullable = false)
    @Builder.Default
    private Boolean isSystem = false;

    /** Danh sách phân quyền (RolePermission) được gán cho vai trò này. */
    @OneToMany(mappedBy = "roleEntity", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<RolePermissionEntity> rolePermissions = new HashSet<>();
}