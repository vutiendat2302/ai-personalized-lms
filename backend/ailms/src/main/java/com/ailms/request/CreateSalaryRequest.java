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

    @NotBlank(message = "Salary period is required")
    private YearMonth period;

    private BigDecimal baseSalary;

    private SalaryTypeEnum salaryTypeEnum;

    private BigDecimal bonus;

    private BigDecimal deduction;

    private BigDecimal totalSalary;

    private SalaryStatusEnum status;

    private LocalDateTime paidAt;

    private String description;
}
