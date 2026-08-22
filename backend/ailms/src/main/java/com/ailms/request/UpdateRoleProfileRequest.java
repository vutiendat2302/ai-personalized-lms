package com.ailms.request;

import com.ailms.entity.enums.EmploymentTypeEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class UpdateRoleProfileRequest {
    private String educationLevel;
    private String schoolName;
    private String goal;
    private String description;
    private Boolean isMinor;

    @Valid
    private List<ProfileGuardianRequest> guardians;

    private Long departmentId;

    @Size(max = 100, message = "Position must not exceed 100 characters")
    private String position;

    @Size(max = 2000, message = "Bio must not exceed 2000 characters")
    private String bio;

    private EmploymentTypeEnum employmentTypeEnum;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @Size(max = 255, message = "Address must not exceed 255 characters")
    private String address;
}
