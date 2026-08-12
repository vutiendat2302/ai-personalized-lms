package com.ailms.response.ai;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/** Câu hỏi AI sinh, được Backend kiểm tra trước khi lưu vào quiz block và bảng quan hệ. */
@Data
public class AiGeneratedQuestionResponse {
    private String content;
    private String questionType;
    private BigDecimal points;
    private String explanation;
    private List<AiGeneratedQuestionOptionResponse> options;
}
