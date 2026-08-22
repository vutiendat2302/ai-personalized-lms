package com.ailms.response.ai;

import lombok.*;

/** Tiêu đề hội thoại do ai-service sinh. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiConversationTitleResponse {
    private String title;
}
