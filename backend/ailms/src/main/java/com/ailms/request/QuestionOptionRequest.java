package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionOptionRequest {

    @NotNull(message = "Question ID is required")
    private Long questionId;

    private String content;

    private Boolean isCorrect;

    private Integer orderIndex;
}
