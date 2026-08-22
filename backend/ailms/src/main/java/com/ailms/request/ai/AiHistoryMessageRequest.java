package com.ailms.request.ai;

import lombok.*;

/** Tin nhắn lịch sử nội bộ gửi sang ai-service. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiHistoryMessageRequest {
    private String role;
    private String content;
}
