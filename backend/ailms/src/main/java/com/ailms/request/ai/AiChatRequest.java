package com.ailms.request.ai;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO cho tính năng AI Chat streaming.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatRequest {

    @NotBlank(message = "Câu hỏi không được để trống")
    private String question;

    private String conversationId;

    private String systemInstruction;
}
