package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import com.ailms.entity.enums.BaseStatusEnum;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizRequest {

    private Long lessonId;

    private Long courseId;

    private Long sectionId;

    private Long classId;

    private Long sourceQuizId;

    private String code;

    @NotBlank(message = "Title must not be blank")
    private String title;

    private String description;

    private Integer timeLimitMin;

    private BigDecimal passScore;

    private Integer maxAttempts;

    private Boolean shuffleQuestions;

    private LocalDateTime availableFrom;

    private Boolean showResultAfterSubmit;

    private LocalDateTime dueAt;

    private BaseStatusEnum status;

    @jakarta.validation.Valid
    private List<QuizQuestionRequest> questions;
}
