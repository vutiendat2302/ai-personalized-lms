package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionRequest {

    @NotNull(message = "Quiz ID is required")
    private Long quizId;

    private String content;

    private Byte questionType;

    private BigDecimal points;

    private Integer orderIndex;

    private String explanation;

    private Byte status;
}
