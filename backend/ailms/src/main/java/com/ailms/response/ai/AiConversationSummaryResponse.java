package com.ailms.response.ai;

import com.ailms.entity.enums.AiConversationScope;
import lombok.*;

import java.time.LocalDateTime;

/** Thông tin gọn dùng trong danh sách lịch sử phân trang. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiConversationSummaryResponse {
    private String id;
    private String title;
    private AiConversationScope scope;
    private String module;
    private String route;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
