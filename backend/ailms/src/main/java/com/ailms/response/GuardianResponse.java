package com.ailms.response;

import com.ailms.entity.enums.GuardianRelationship;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuardianResponse {

    private Long id;

    private Long studentUserId;

    private String fullName;

    private GuardianRelationship relationship;

    private String phone;

    private String email;

    private String address;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
