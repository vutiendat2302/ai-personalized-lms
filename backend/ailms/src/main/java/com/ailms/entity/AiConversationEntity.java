package com.ailms.entity;

import com.ailms.entity.enums.AiConversationScope;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/** Cuộc hội thoại AI thuộc riêng một người dùng quản trị. */
@Entity
@Table(name = "ai_conversation", indexes = {
        @Index(name = "idx_ai_conversation_owner_updated", columnList = "owner_id, last_message_at")
})
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class AiConversationEntity extends BaseEntity {

    /** ID chuỗi do backend tạo khi bắt đầu hội thoại mới. */
    @Id
    @Column(name = "id", nullable = false, updatable = false, length = 64)
    private String id;

    /** ID user sở hữu, dùng để chống truy cập chéo hội thoại. */
    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    /** Loại trợ lý để không trộn các nhóm lịch sử khác nhau. */
    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false, length = 30)
    private AiConversationScope scope;

    /** Tiêu đề ngắn lấy từ câu hỏi đầu tiên. */
    @Column(name = "title", nullable = false, length = 160)
    private String title;

    /** Module quản trị gần nhất của cuộc trò chuyện. */
    @Column(name = "module", nullable = false, length = 50)
    private String module;

    /** Route quản trị gần nhất để cung cấp ngữ cảnh UI. */
    @Column(name = "context_route", length = 255)
    private String contextRoute;

    /** Thời điểm có tin nhắn mới nhất để sắp xếp lịch sử. */
    @Column(name = "last_message_at", nullable = false)
    private LocalDateTime lastMessageAt;
}
