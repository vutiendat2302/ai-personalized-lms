package com.ailms.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionOptionResponse {

    private Long id;

    private Long questionId;

    private String content;

    private Boolean isCorrect;

    private Integer orderIndex;
}
