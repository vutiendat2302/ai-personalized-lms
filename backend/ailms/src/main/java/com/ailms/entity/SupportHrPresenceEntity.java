package com.ailms.entity;

import com.ailms.entity.enums.SupportHrPresenceStatusEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Heartbeat và trạng thái nhận ticket của HR. */
@Entity
@Table(name = "support_hr_presence")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportHrPresenceEntity {
    /** User ID của HR. */
    @Id
    @Column(name = "hr_id", nullable = false)
    private Long hrId;

    /** Tài khoản HR, phải có role HR hoặc ADMIN. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_id", insertable = false, updatable = false)
    private UserEntity hr;

    /** Trạng thái hiện diện do heartbeat và workload hệ thống tự suy ra. */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private SupportHrPresenceStatusEnum status = SupportHrPresenceStatusEnum.OFFLINE;

    /** Mốc heartbeat cuối cùng. */
    @Column(name = "last_heartbeat_at", nullable = false)
    private LocalDateTime lastHeartbeatAt;
}
