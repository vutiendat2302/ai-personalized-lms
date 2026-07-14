package com.ailms.request;

import com.ailms.entity.EmployeeStatusEnum;
import com.ailms.entity.EmploymentTypeEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "Employee code must not be blank")
    private String employeeCode;

    private Long departmentId;

    private String position;

    private EmploymentTypeEnum employmentTypeEnum;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private EmployeeStatusEnum status;
}
