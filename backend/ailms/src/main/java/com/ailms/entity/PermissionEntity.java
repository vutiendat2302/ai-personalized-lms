package com.ailms.entity;


import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

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

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /**
     * Mã permission dạng "resource:action", VD: "course:create", "course:read",
     * "course:update:own" (chừa sẵn hậu tố ":own"/":any" để bước sang ABAC scope sau này).
     */
    @Column(name = "name", nullable = false, unique = true, length = 50)
    private String name;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "entity", nullable = false, length = 50)
    private String entity;

    @Column(name = "action", nullable = false, length = 50)
    private String action;

    @Column(name = "description")
    private String description;
}
