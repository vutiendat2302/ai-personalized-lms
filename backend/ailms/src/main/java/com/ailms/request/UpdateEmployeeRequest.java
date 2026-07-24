package com.ailms.request;

import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.EmploymentTypeEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEmployeeRequest {
    private Long userId;

    private String employeeCode;

    private Long departmentId;

    private String position;

    private EmploymentTypeEnum employmentTypeEnum;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private EmployeeStatusEnum status;
}
