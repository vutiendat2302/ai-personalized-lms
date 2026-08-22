package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

/**
 * Thực thể chi tiết từng khoản mục tính lương (lương cứng, phụ cấp, thưởng, BHXH, thuế TNCN, thực nhận...).
 */
@Entity
@Table(name = "salary_detail")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class SalaryDetailEntity extends BaseEntity {

    /** Mã định danh chi tiết lương (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Bảng lương tổng hợp tương ứng. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "salary_id", nullable = false)
    private SalaryEntity salary;

    /** Mã khoản mục: BASE_SALARY, MEAL_ALLOWANCE, BHXH_DEDUCTION, PIT_TAX, NET_PAY... */
    @Column(name = "item_key", nullable = false, length = 50)
    private String itemKey;

    /** Số tiền tương ứng của khoản mục. */
    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    /** Mô tả hoặc giải trình chi tiết cho khoản mục. */
    @Column(name = "description", length = 255)
    private String description;
}