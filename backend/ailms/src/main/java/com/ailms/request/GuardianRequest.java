package com.ailms.request;

import com.ailms.entity.GuardianRelationship;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuardianRequest {

    @NotNull(message = "Student user ID is required")
    private Long studentUserId;

    @NotBlank(message = "Guardian full name is required")
    private String fullName;

    private GuardianRelationship relationship;

    private String phone;

    private String email;

    private String address;
}
