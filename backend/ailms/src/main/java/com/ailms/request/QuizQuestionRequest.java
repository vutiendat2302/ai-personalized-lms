package com.ailms.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

/** Câu hỏi có cấu trúc dùng khi tạo hoặc cập nhật quiz. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestionRequest {
    private Long id;

    @NotBlank(message = "Nội dung câu hỏi không được để trống")
    private String content;

    @NotBlank(message = "Loại câu hỏi không được để trống")
    private String questionType;

    @DecimalMin(value = "0.01", message = "Điểm câu hỏi phải lớn hơn 0")
    private BigDecimal points;

    private String explanation;

    @Valid
    @NotEmpty(message = "Câu hỏi quiz phải có phương án trả lời")
    private List<QuizQuestionOptionRequest> options;
}
