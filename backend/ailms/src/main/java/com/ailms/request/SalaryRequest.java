package com.ailms.request;

import com.ailms.entity.SalaryStatusEnum;
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
public class SalaryRequest {

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotBlank(message = "Salary period is required")
    private YearMonth period;

    private BigDecimal baseSalary;

    private BigDecimal bonus;

    private BigDecimal deduction;

    private BigDecimal totalSalary;

    private SalaryStatusEnum status;

    private LocalDateTime paidAt;
}
