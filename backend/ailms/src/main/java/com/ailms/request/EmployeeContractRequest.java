package com.ailms.request;

import com.ailms.entity.ContractStatus;
import com.ailms.entity.ContractType;
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

    private ContractType contractType;

    private LocalDate startDate;

    private LocalDate endDate;

    private BigDecimal baseSalary;

    private String fileUrl;

    private ContractStatus status;

    private LocalDateTime signedAt;
}
