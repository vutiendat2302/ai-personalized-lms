package com.ailms.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.ailms.entity.enums.BaseStatusEnum;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizResponse {

    private Long id;

    private Long lessonId;

    private Long courseId;

    private Long sectionId;

    private Long classId;

    private String code;

    private String title;

    private String description;

    private Integer timeLimitMin;

    private BigDecimal passScore;

    private Integer maxAttempts;

    private Boolean shuffleQuestions;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dueAt;

    private BaseStatusEnum status;

    private Object questions;

    private String createdBy;

    private String updatedBy;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
