package com.ailms.request.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Request chat catalog công khai, không nhận owner hoặc role từ trình duyệt. */
@Data
public class PublicAiChatRequest {
    @NotBlank(message = "Câu hỏi không được để trống")
    @Size(max = 2000, message = "Câu hỏi tối đa 2000 ký tự")
    private String question;

    @Size(max = 64, message = "ID hội thoại tối đa 64 ký tự")
    private String conversationId;
}
