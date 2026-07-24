package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherChangeRequest {

    @NotNull(message = "Enrollment ID is required")
    private Long enrollmentId;

    @NotBlank(message = "Change reason is required")
    private String reason;
}
