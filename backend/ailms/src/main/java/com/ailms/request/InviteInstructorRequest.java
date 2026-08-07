package com.ailms.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InviteInstructorRequest {

    private String email;
    private Long instructorId;
}
