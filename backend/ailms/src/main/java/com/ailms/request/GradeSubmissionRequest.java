package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeSubmissionRequest {

    @NotNull(message = "Score is required")
    private BigDecimal score;

    private String feedback;

    @Builder.Default
    private Boolean returnForResubmission = false;
}
