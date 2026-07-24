package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionRequest {

    @NotNull(message = "Assignment ID is required")
    private Long assignmentId;

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotNull(message = "Enrollment ID is required")
    private Long enrollmentId;

    private String contentText;

    private String fileUrl;

    private LocalDateTime submittedAt;

    private Boolean isLate;

    private BigDecimal score;

    private String feedback;

    private Long gradedBy;

    private LocalDateTime gradedAt;

    private Byte status;
}
