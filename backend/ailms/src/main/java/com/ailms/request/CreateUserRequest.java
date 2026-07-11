package com.ailms.request;

import com.ailms.entity.UserStatusEntity;
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

public class CreateUserRequest {

    @NotBlank(message = "Username cannot be blank")
    @Size(min = 6, max = 50, message = "Username must be between 6 and 50 characters")
    @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "Username may only contain letters, numbers, dots (.), underscores (_) and hyphens (-)")
    private String username;

    @NotBlank(message = "Email cannot be blank")
    @Email(message = "Email should be valid")
    private String email;

    private String password;

    private String fullName;

    private String phone;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    @Min(value = 0, message = "Gender is invalid")
    @Max(value = 2, message = "Gender is invalid")
    private Integer gender;

    private UserStatusEntity status;

    private List<Long> roleIds;
}
