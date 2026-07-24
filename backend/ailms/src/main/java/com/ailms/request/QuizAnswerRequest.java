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
public class QuizAnswerRequest {

    @NotNull(message = "Attempt ID is required")
    private Long attemptId;

    @NotNull(message = "Question ID is required")
    private Long questionId;

    private Long selectedOptionId;

    private String answerText;

    private Boolean isCorrect;

    private BigDecimal pointsEarned;

    private LocalDateTime createdAt;
}
