package com.ailms.response.ai;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/** Preview quiz AI sinh đúng shape mà Course Builder đang dùng. */
@Data
public class AiGeneratedQuizResponse {
    private String title;
    private String description;
    private Integer timeLimitMin;
    private BigDecimal passScore;
    private Integer maxAttempts;
    private Boolean shuffleQuestions;
    private List<AiGeneratedQuestionResponse> questions;
}
