package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.SalaryStatusEnum;
import com.ailms.entity.enums.SalaryTypeEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * Lưu trữ bảng lương tổng hợp của nhân viên theo từng kỳ thanh toán (tháng/năm).
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

    /** Mã định danh phiếu lương (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Nhân viên nhận lương. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeEntity employee;

    /** Kỳ lương (định dạng YearMonth: YYYY-MM, ví dụ 2026-07). */
    @Column(name = "period", nullable = false, length = 50)
    private YearMonth period;

    /** Mức lương cơ bản áp dụng trong kỳ lương này. */
    @Column(name = "base_salary", precision = 12, scale = 2)
    private BigDecimal baseSalary;

    /** Hình thức tính lương (HOURLY, DAILY, MONTHLY). */
    @Column(name = "salary_type")
    @Enumerated(EnumType.STRING)
    private SalaryTypeEnum salaryTypeEnum;

    /** Tổng tiền thưởng trong kỳ lương (thưởng giảng dạy, khen thưởng). */
    @Column(name = "bonus", precision = 12, scale = 2)
    private BigDecimal bonus;

    /** Tổng các khoản khấu trừ (BHXH, thuế TNCN, phạt nghỉ không phép...). */
    @Column(name = "deduction", precision = 12, scale = 2)
    private BigDecimal deduction;

    /** Tổng lương thực nhận (totalSalary = baseSalary + bonus - deduction). */
    @Column(name = "total_salary", precision = 19, scale = 2)
    private BigDecimal totalSalary;

    /** Trạng thái xử lý và thanh toán lương (DRAFT, APPROVED, PAID, CANCELLED). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SalaryStatusEnum status = SalaryStatusEnum.DRAFT;

    /** Thời điểm hoàn tất chuyển khoản / thanh toán lương. */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    /** Ghi chú chi tiết về kỳ lương. */
    @Column(name = "description")
    private String description;

    /** Danh sách các khoản mục chi tiết thành phần trong phiếu lương. */
    @OneToMany(mappedBy = "salary", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<SalaryDetailEntity> details = new ArrayList<>();
}
