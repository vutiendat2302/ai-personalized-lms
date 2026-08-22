package com.ailms.request;

import com.ailms.entity.enums.SalaryStatusEnum;
import com.ailms.entity.enums.SalaryTypeEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateSalaryRequest {

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotNull(message = "Salary period is required")
    private YearMonth period;

    /** Phụ cấp ăn trưa */
    private BigDecimal mealAllowance;

    /** Phụ cấp điện thoại */
    private BigDecimal phoneAllowance;

    /** Phụ cấp trang phục */
    private BigDecimal uniformAllowance;

    /** Phụ cấp trách nhiệm */
    private BigDecimal responsibilityAllowance;

    /** Phụ cấp hiệu suất */
    private BigDecimal performanceAllowance;

    /** Lương đóng bảo hiểm (nếu không nhập, mặc định = baseSalary + responsibility) */
    private BigDecimal insuranceSalary;

    /** Số người phụ thuộc để tính giảm trừ gia cảnh */
    private Integer dependents;

    private BigDecimal bonus;

    private BigDecimal deduction;

    private String description;
}
