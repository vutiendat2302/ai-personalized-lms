package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.SalaryTypeEnum;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateEmployeeContractRequest {

    private LocalDate startDate;

    private LocalDate endDate;

    private BigDecimal baseSalary;

    private SalaryTypeEnum salaryTypeEnum;

    private BaseStatusEnum status;

}
