package com.ailms.response.ai;

import com.ailms.entity.enums.AiConversationScope;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/** Hội thoại AI kèm danh sách tin nhắn khi xem chi tiết. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiConversationResponse {
    private String id;
    private String title;
    private AiConversationScope scope;
    private String module;
    private String route;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<AiMessageResponse> messages;
}
