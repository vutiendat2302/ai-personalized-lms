package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.SupportMessageSenderEnum;
import com.ailms.entity.enums.SupportMessageTypeEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/** Tin nhắn được lưu bền vững trước khi phát tới client realtime. */
@Entity
@Table(name = "support_chat_message")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class SupportChatMessageEntity extends BaseEntity {
    /** ID Snowflake của tin nhắn. */
    @Id
    @SnowflakeId
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    /** Phiên chứa tin nhắn. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private SupportConversationEntity conversation;

    /** Nguồn gửi tin nhắn. */
    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false, length = 20)
    private SupportMessageSenderEnum senderType;

    /** Loại dữ liệu của tin nhắn. */
    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 30)
    private SupportMessageTypeEnum messageType;

    /** Nội dung đã sanitize, không chứa token hoặc dữ liệu bí mật. */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** Metadata JSON phục vụ quick reply/course result. */
    @Column(name = "metadata", columnDefinition = "JSON")
    private String metadata;

    /** Đã đọc bởi bên nhận hay chưa. */
    @Column(name = "read_at")
    private java.time.LocalDateTime readAt;
}
