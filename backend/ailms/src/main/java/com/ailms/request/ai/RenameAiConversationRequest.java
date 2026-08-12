package com.ailms.request.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Payload đổi tiêu đề hội thoại. */
@Data
public class RenameAiConversationRequest {
    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 160, message = "Tiêu đề tối đa 160 ký tự")
    private String title;
}
