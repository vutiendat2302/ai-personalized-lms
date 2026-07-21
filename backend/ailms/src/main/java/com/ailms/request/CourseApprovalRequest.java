package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseApprovalRequest {

    @NotNull(message = "Approve flag is required")
    private Boolean approve;

    private String rejectionReason;
}
