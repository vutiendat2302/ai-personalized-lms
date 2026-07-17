package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.ApprovalStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Luu tru thong tin yeu cau phe duyet cho cac doi tuong nghiep vu (Contract, Salary, Session Payment...)
 */
@Entity
@Table(name = "approval_request")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ApprovalRequestEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "target_type", nullable = false, length = 50)
    private String targetType; // e.g. "CONTRACT", "SALARY", "TEACHING_PAYMENT"

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(name = "level", nullable = false)
    @Builder.Default
    private int level = 1;

    @Column(name = "total_levels", nullable = false)
    @Builder.Default
    private int totalLevels = 1;

    @Column(name = "approver_id")
    private Long approverId;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ApprovalStatusEnum status = ApprovalStatusEnum.PENDING;

    @Column(name = "comment")
    private String comment;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;
}
