package com.ailms.response;

import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.EmploymentTypeEnum;
import com.ailms.entity.enums.UserStatusEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeResponse {

    private Long id;

    private Long userId;

    private String userName;

    private String userEmail;

    private String fullName;

    private String employeeCode;

    private String avatarUrl;

    private String phone;

    private Integer gender;

    private String address;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dateOfBirth;

    private Long departmentId;

    private String departmentName;

    private String departmentCode;

    private String position;

    private String bio;

    private List<String> roles;

    private List<Long> roleIds;

    private EmploymentTypeEnum employmentTypeEnum;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startDate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime endDate;

    private EmployeeStatusEnum status;

    private UserStatusEnum userStatus;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
