package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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

    private String code;

    @NotBlank(message = "Title must not be blank")
    private String title;

    private String description;

    private Integer timeLimitMin;

    private BigDecimal passScore;

    private Integer maxAttempts;

    private Boolean shuffleQuestions;

    private LocalDateTime dueAt;

    private BaseStatusEnum status;
}
