package com.ailms.response.ai;

import lombok.Data;

import java.math.BigDecimal;

/** Preview assignment AI sinh đúng metadata block editor hiện tại. */
@Data
public class AiGeneratedAssignmentResponse {
    private String title;
    private String instructions;
    private BigDecimal maxScore;
    private Boolean allowLate;
    private String submissionMode;
}
