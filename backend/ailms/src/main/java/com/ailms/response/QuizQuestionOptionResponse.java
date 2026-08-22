package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Phương án quiz trả cho frontend với ID bền vững. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestionOptionResponse {
    private Long id;
    private String content;
    private Boolean isCorrect;
    private Integer orderIndex;
}
