package com.ailms.request;

import com.ailms.entity.enums.GuardianRelationship;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateGuardianRequest {
    private String fullName;

    private GuardianRelationship relationship;

    private String phone;

    private String email;

    private String address;
}
