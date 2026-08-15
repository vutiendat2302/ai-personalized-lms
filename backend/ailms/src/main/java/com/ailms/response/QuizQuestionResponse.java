package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

/** Câu hỏi quiz trả cho frontend cùng Snowflake ID thật của phương án. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestionResponse {
    private Long id;
    private String content;
    private String questionType;
    private BigDecimal points;
    private Integer orderIndex;
    private String explanation;
    private List<QuizQuestionOptionResponse> options;
}
