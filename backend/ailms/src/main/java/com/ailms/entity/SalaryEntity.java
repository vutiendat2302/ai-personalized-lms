package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "salary", uniqueConstraints = {
        @UniqueConstraint(name = "uk_employee_period", columnNames = {"employee_id", "period"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SalaryEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeEntity employee;

    @Column(name = "period", nullable = false, length = 50)
    private String period;

    @Column(name = "base_salary", precision = 12, scale = 2)
    private BigDecimal baseSalary;

    @Column(name = "bonus", precision = 12, scale = 2)
    private BigDecimal bonus;

    @Column(name = "deduction", precision = 12, scale = 2)
    private BigDecimal deduction;

    @Column(name = "total_salary", precision = 12, scale = 2)
    private BigDecimal totalSalary;

    @Column(name = "status")
    @Enumerated(EnumType.ORDINAL)
    private SalaryStatus status;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}
