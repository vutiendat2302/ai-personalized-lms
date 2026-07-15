package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.SalaryStatusEnum;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;

/**
 * Luu tru bang luong cua nhan vien theo tung ky thanh toan
 */
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

    /** * Kỳ lương. * Ví dụ: 2026-07, 2026-08. */
    @Column(name = "period", nullable = false, length = 50)
    private YearMonth period;

    /** * Lương cơ bản áp dụng trong kỳ lương. */
    @Column(name = "base_salary", precision = 12, scale = 2)
    private BigDecimal baseSalary;

    /** * Khoản thưởng trong kỳ lương. */
    @Column(name = "bonus", precision = 12, scale = 2)
    private BigDecimal bonus;

    /** * Tổng các khoản khấu trừ. */
    @Column(name = "deduction", precision = 12, scale = 2)
    private BigDecimal deduction;

    /** * Tổng lương thực nhận. totalSalary = baseSalary + bonus - deduction. */
    @Column(name = "total_salary", precision = 12, scale = 2)
    private BigDecimal totalSalary;

    /** * Trạng thái xử lý và thanh toán lương. */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private SalaryStatusEnum status;

    /** * Thời điểm hoàn tất thanh toán lương. */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}
