package com.ailms.request.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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

    @Size(max = 64, message = "ID hội thoại tối đa 64 ký tự")
    private String conversationId;

    private String systemInstruction;

    @Size(max = 50, message = "Module tối đa 50 ký tự")
    private String module;

    @Size(max = 255, message = "Route tối đa 255 ký tự")
    private String route;

    private String retrievalMode;

    private Long courseId;

    private Long lessonId;

    private String retrievalScope;

    /** Chỉ Backend được phép ghi field này sau khi resolve enrollment. */
    private Long classId;
}
