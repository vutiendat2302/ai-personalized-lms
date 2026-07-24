package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResendOtpRequest {

    @NotBlank(message = "Username or email cannot be blank")
    @Size(
            min = 6,
            message = "Username or email must be between 3 and 100 characters"
    )
    @Pattern(
            regexp = "^\\S+$",
            message = "Username or email must not contain spaces"
    )
    private String usernameOrEmail; // có thể là email, username
}
