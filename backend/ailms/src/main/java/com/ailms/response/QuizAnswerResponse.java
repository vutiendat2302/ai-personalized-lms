package com.ailms.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAnswerResponse {

    private Long id;

    private Long attemptId;

    private Long questionId;

    private Long selectedOptionId;

    private String answerText;

    private Boolean isCorrect;

    private BigDecimal pointsEarned;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
}
