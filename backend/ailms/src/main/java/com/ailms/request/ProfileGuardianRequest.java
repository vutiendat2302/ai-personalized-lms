package com.ailms.request;

import com.ailms.entity.enums.GuardianRelationship;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProfileGuardianRequest {
    private Long id;

    @Size(max = 255, message = "Guardian full name must not exceed 255 characters")
    private String fullName;

    private GuardianRelationship relationship;

    @Size(max = 20, message = "Guardian phone must not exceed 20 characters")
    private String phone;

    @Size(max = 255, message = "Guardian email must not exceed 255 characters")
    private String email;

    @Size(max = 255, message = "Guardian address must not exceed 255 characters")
    private String address;
}
