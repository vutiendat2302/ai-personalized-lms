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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEmployeeRequest {

    private Long departmentId;

    private String position;

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
    private String fullName;

    /**
     * Giới tính — sẽ được cập nhật sang UserEntity.gender
     * 0 = Nam, 1 = Nữ, 2 = Khác
     */
    private Integer gender;

    /**
     * Số điện thoại — sẽ được cập nhật sang UserEntity.phone
     */
    private String phone;

    /**
     * Ngày sinh — sẽ được cập nhật sang UserEntity.dateOfBirth
     */
    @JsonFormat(pattern = "yyyy-MM-dd['T'HH:mm:ss][ HH:mm:ss]")
    private LocalDateTime dateOfBirth;
}

