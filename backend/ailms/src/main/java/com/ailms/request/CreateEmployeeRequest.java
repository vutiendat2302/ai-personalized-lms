package com.ailms.request;

import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.EmploymentTypeEnum;
import com.ailms.entity.enums.SalaryTypeEnum;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
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

    @Pattern(regexp = "^[a-zA-Z0-9._-]{4,50}$", message = "Username must contain 4-50 valid characters")
    private String username;

    @Size(min = 2, max = 100)
    private String fullName;

    @Pattern(regexp = "^$|^[0-9\\+\\(\\)\\s\\.-]{8,20}$", message = "Invalid Vietnamese phone number")
    private String phone;

    private Integer gender;

    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    private String password;

    private Long roleId; // e.g. 1, 2, 3

    private String employeeCode;

    @NotNull(message = "Department is required")
    private Long departmentId;

    private String address;

    @NotBlank(message = "Position is required")
    @Size(min = 2, max = 100)
    private String position;

    @NotNull(message = "Employment type is required")
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

    /** UPLOAD: create then attach contractFile; WEB_GENERATE: generate PDF from template. */
    private String contractCreationMode;

    private Long contractTemplateId;

    private LocalDateTime contractSignedAt;
}
