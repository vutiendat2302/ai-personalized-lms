package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.AiFeedbackType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/** Tin nhắn user hoặc assistant trong một cuộc hội thoại AI. */
@Entity
@Table(name = "ai_message", indexes = {
        @Index(name = "idx_ai_message_conversation_created", columnList = "conversation_id, created_at")
})
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class AiMessageEntity extends BaseEntity {

    /** ID Snowflake của tin nhắn. */
    @Id
    @SnowflakeId
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    /** Hội thoại chứa tin nhắn. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private AiConversationEntity conversation;

    /** Vai trò USER hoặc ASSISTANT. */
    @Column(name = "role", nullable = false, length = 20)
    private String role;

    /** Nội dung text của tin nhắn. */
    @Lob
    @Column(name = "content", nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    /** Feedback tùy chọn của user cho câu trả lời assistant. */
    @Enumerated(EnumType.STRING)
    @Column(name = "feedback", length = 20)
    private AiFeedbackType feedback;
}
