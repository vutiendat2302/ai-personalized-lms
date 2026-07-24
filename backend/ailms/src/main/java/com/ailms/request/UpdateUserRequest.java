package com.ailms.request;

import com.ailms.entity.enums.UserStatusEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UpdateUserRequest {

    private String fullName;

    private String phone;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    @Min(value = 0, message = "Gender is invalid")
    @Max(value = 2, message = "Gender is invalid")
    private Integer gender;

    private String avatarUrl;

    private UserStatusEnum status;

    private List<Long> roleIds;

    private String attributes;
}
