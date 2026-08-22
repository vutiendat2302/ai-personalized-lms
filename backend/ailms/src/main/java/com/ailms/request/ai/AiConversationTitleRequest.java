package com.ailms.request.ai;

import lombok.*;

/** Request nội bộ tạo tiêu đề từ câu hỏi đầu tiên. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiConversationTitleRequest {
    private String question;
}
