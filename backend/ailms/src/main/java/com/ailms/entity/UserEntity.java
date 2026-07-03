package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "user", indexes = {
        @Index(name = "idx_user_username", columnList = "username", unique = true),
        @Index(name = "idx_user_email", columnList = "email", unique = true)
})
public class UserEntity extends BaseEntity{

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "username", nullable = false, unique = true, length = 100)
    private String username;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "full_name", length = 255)
    private String fullName;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "avatar_url", length = 255)
    private String avatarUrl;

    @Column(name = "gender")
    private Integer gender; // tinyint mapping to Integer (0,1,2...)

    @Column(name = "date_of_birth")
    private LocalDateTime dateOfBirth;

    @Column(name = "attributes", columnDefinition = "json")
    private String attributes; // store as JSON string, can be parsed when needed

    @Column(name = "status")
    @Enumerated(EnumType.ORDINAL)
    private UserStatusEntity status;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
}
