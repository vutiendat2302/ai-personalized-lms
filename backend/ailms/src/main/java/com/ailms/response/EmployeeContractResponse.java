package com.ailms.response;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.entity.enums.SalaryTypeEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeContractResponse {

    private Long id;

    private Long employeeId;

    private ContractTypeEnum contractTypeEnum;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;

    private BigDecimal baseSalary;

    private SalaryTypeEnum salaryTypeEnum;

    private String fileKey;

    private String fileName;

    private Long fileSize;

    private BaseStatusEnum status;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime signedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    private Long createdBy;
    private Long updatedBy;
}
