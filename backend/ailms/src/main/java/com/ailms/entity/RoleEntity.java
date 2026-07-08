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

//    id sinh bang snowflake
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

//    Ten hien thi Role
    /** Mã role, VD: ADMIN, INSTRUCTOR, TEACHER, STUDENT. Lưu chữ hoa, không dấu cách. */
    @Column(name = "name", nullable = false, unique = true, length = 50)
    private String name;

//    Ma dinh danh hien thi trong he thong
    @Column(name = "code", nullable = false, unique = true, length = 30)
    private String code;

//     Mo ta chuc nang, muc dich
    @Column(name = "description")
    private String description;


    /** Role hệ thống (seed sẵn) thì không cho xóa, VD: ADMIN. */
    @Column(name = "is_system", nullable = false)
    @Builder.Default
    private Boolean isSystem = false;

//    Danh sach permission duoc gan cho role
    @OneToMany(mappedBy = "roleEntity", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<RolePermissionEntity> rolePermissions = new HashSet<>();
}