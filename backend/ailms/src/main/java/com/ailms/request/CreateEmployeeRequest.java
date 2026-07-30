package com.ailms.request;

import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.EmploymentTypeEnum;
import com.ailms.entity.enums.SalaryTypeEnum;
import jakarta.validation.constraints.Email;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateEmployeeRequest {

    /** If user ID is provided, attaches employee profile to existing user. */
    private Long userId;

    /** If userId is null, HR can pass user creation info inline */
    @Email(message = "Email format is invalid")
    private String email;

    private String fullName;

    private String password;

    private Long roleId; // e.g. 1, 2, 3

    private String employeeCode;

    private Long departmentId;

    private String address;

    private String position;

    private EmploymentTypeEnum employmentTypeEnum;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    /** Optional initial contract info */
    private ContractTypeEnum contractTypeEnum;

    private LocalDate contractStartDate;

    private LocalDate contractEndDate;

    private BigDecimal baseSalary;

    private SalaryTypeEnum salaryTypeEnum;

    private String contractFileKey;
}
