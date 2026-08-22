package com.ailms.response.ai;

import lombok.Data;

/** Phương án đáp án AI sinh, tương thích cấu trúc question option của Course Builder. */
@Data
public class AiGeneratedQuestionOptionResponse {
    private String content;
    private Boolean isCorrect;
}
