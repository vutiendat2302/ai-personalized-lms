package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizRequest {

    private Long lessonId;

    private Long courseId;

    private Long sectionId;

    private String code;

    @NotBlank(message = "Title must not be blank")
    private String title;

    private String description;

    private Integer timeLimitMin;

    private BigDecimal passScore;

    private Integer maxAttempts;

    private Boolean shuffleQuestions;

    private Byte status;
}
