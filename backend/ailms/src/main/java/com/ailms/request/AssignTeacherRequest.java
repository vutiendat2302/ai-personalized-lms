package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignTeacherRequest {

    @NotNull(message = "Employee ID is required")
    private Long employeeId;
}
