package com.ailms.request.ai;

import com.ailms.request.QuizQuestionRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/** Nội dung Quiz đã được giáo viên chỉnh sửa trong bước review trước khi apply draft. */
@Data
public class AiAssessmentQuizEditRequest {
    @NotBlank
    @Size(max = 255)
    private String title;

    @Size(max = 5000)
    private String description;

    @Min(1)
    @Max(300)
    private Integer timeLimitMin;

    @DecimalMin("0")
    @DecimalMax("100")
    private BigDecimal passScore;

    @Min(1)
    @Max(20)
    private Integer maxAttempts;

    private Boolean shuffleQuestions;

    @Valid
    @NotNull
    @Size(min = 1, max = 15)
    private List<QuizQuestionRequest> questions;
}
