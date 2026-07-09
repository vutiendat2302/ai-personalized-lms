package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(name = "teaching_session_payment", uniqueConstraints = {
        @UniqueConstraint(name = "uk_class_online_id", columnNames = {"class_online_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TeachingSessionPaymentEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "class_online_id", nullable = false, unique = true)
    private Long classOnlineId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeEntity employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rate_id")
    private TeachingRateEntity teachingRate;

    @Column(name = "rate_applied", precision = 12, scale = 2)
    private BigDecimal rateApplied;

    @Column(name = "actual_duration_min")
    private Integer actualDurationMin;

    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "status")
    @Enumerated(EnumType.ORDINAL)
    private SessionPaymentStatus status;
}
