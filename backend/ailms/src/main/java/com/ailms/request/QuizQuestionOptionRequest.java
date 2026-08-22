package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Phương án trả lời có cấu trúc của một câu hỏi quiz. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestionOptionRequest {
    private Long id;

    @NotBlank(message = "Nội dung phương án không được để trống")
    private String content;

    private Boolean isCorrect;
}
