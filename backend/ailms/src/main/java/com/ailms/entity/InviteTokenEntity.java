package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "invite_token")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InviteTokenEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "token", nullable = false, unique = true)
    private String token;

    @Column(name = "role_ids")
    private String roleIds; // comma-separated list of role IDs

    @Column(name = "status", nullable = false)
    private String status; // PENDING, ACCEPTED, EXPIRED

    @Column(name = "expiry_time", nullable = false)
    private LocalDateTime expiryTime;
}
