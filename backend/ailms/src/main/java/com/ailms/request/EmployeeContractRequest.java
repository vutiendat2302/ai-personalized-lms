package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ContractTypeEnum;
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
public class EmployeeContractRequest {

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    private ContractTypeEnum contractTypeEnum;

    private LocalDate startDate;

    private LocalDate endDate;

    private BigDecimal baseSalary;

    private String fileUrl;

    private BaseStatusEnum status;

    private LocalDateTime signedAt;
}
