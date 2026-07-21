package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeFillInBlankRequest {

    private List<QuestionGrade> grades;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionGrade {
        @NotNull(message = "Question ID is required")
        private Long questionId;

        @NotNull(message = "isCorrect is required")
        private Boolean isCorrect;

        @NotNull(message = "Points earned is required")
        private BigDecimal pointsEarned;
    }
}
