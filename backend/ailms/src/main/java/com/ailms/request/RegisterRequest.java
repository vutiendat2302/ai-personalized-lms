package com.ailms.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Username cannot be blank")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @NotBlank(message = "Email cannot be blank")
    @Email(message = "Email should be valid")
    private String email;

    @NotBlank(message = "Password cannot be blank")
    @Size(min = 6, max = 100, message = "Password must be at least 6 characters")
    @Pattern(
            regexp = "^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?\":{}|<>]).+$",
            message = "Password must contain at least 1 uppercase letter and 1 special character"
    )
    private String password;

    private String fullName;

    @Pattern(regexp = "^(0|\\+84)(3|5|7|8|9)[0-9]{8}$", message = "Phone number is invalid")
    private String phone;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    @Min(value = 0, message = "Gender is invalid")
    @Max(value = 2, message = "Gender is invalid")
    private Integer gender;
}
