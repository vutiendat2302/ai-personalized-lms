package com.ailms.response;

import com.ailms.entity.enums.SalaryStatusEnum;
import com.ailms.entity.enums.SalaryTypeEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryResponse {

    private Long id;

    private Long employeeId;

    private String employeeName;

    private String employeeCode;

    private String departmentName;

    private String avatarUrl;

    @JsonFormat(pattern = "yyyy-MM")
    private YearMonth period;

    private BigDecimal baseSalary;

    private BigDecimal bonus;

    private BigDecimal deduction;

    private BigDecimal totalSalary;

    private SalaryTypeEnum salaryTypeEnum;

    private SalaryStatusEnum status;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime paidAt;

    private String description;

    private List<SalaryDetailResponse> details;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    private Long createdBy;
    private Long updatedBy;
}
