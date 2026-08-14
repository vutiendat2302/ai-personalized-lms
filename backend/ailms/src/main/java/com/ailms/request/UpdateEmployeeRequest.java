package com.ailms.request;

import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.EmploymentTypeEnum;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEmployeeRequest {

    private Long departmentId;

    @Size(min = 2, max = 100, message = "Position must be between 2 and 100 characters")
    private String position;

    @Size(max = 2000, message = "Bio must not exceed 2000 characters")
    private String bio;

    @Size(max = 255, message = "Address must not exceed 255 characters")
    private String address;

    @JsonProperty("employmentTypeEnum")
    @JsonAlias({"employmentType", "employmentTypeEnum"})
    private EmploymentTypeEnum employmentTypeEnum;

    @JsonFormat(pattern = "yyyy-MM-dd['T'HH:mm:ss][ HH:mm:ss]")
    private LocalDateTime startDate;

    @JsonFormat(pattern = "yyyy-MM-dd['T'HH:mm:ss][ HH:mm:ss]")
    private LocalDateTime endDate;

    private EmployeeStatusEnum status;

    /**
     * Họ và tên đầy đủ — sẽ được cập nhật sang UserEntity.fullName
     */
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    /**
     * Giới tính — sẽ được cập nhật sang UserEntity.gender
     * 0 = Nam, 1 = Nữ, 2 = Khác
     */
    @Min(value = 0, message = "Gender must be 0, 1 or 2")
    @Max(value = 2, message = "Gender must be 0, 1 or 2")
    private Integer gender;

    /**
     * Số điện thoại — sẽ được cập nhật sang UserEntity.phone
     */
    @Pattern(regexp = "^$|^[0-9\\+\\(\\)\\s\\.-]{8,20}$", message = "Invalid Vietnamese phone number")
    private String phone;

    /**
     * Ngày sinh — sẽ được cập nhật sang UserEntity.dateOfBirth
     */
    @JsonFormat(pattern = "yyyy-MM-dd['T'HH:mm:ss][ HH:mm:ss]")
    @Past(message = "Date of birth must be in the past")
    private LocalDateTime dateOfBirth;
}
