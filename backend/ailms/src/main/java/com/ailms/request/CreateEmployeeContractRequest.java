package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.entity.enums.SalaryTypeEnum;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateEmployeeContractRequest {

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    private ContractTypeEnum contractTypeEnum;

    private LocalDate startDate;

    private LocalDate endDate;

    private BigDecimal baseSalary;

    private SalaryTypeEnum salaryTypeEnum;

    private String fileKey;

    private BaseStatusEnum status;

    private LocalDateTime signedAt;
}
