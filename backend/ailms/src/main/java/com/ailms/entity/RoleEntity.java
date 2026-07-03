package com.ailms.entity;


import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;

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

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Mã role, VD: ADMIN, INSTRUCTOR, TEACHER, STUDENT. Lưu chữ hoa, không dấu cách. */
    @Column(name = "name", nullable = false, unique = true, length = 50)
    private String name;

    @Column(name = "code", nullable = false, unique = true, length = 30)
    private String code;

    @Column(name = "description", length = 255)
    private String description;

    /** Role hệ thống (seed sẵn) thì không cho xóa, VD: ADMIN. */
    @Column(name = "is_system", nullable = false)
    @Builder.Default
    private Boolean isSystem = false;

    @OneToMany(mappedBy = "roleEntity", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<RolePermissionEntity> rolePermissions = new HashSet<>();
}