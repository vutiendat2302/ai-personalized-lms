package com.ailms.response.support;

import com.ailms.entity.enums.SupportMessageSenderEnum;
import com.ailms.entity.enums.SupportMessageTypeEnum;

import java.time.LocalDateTime;

/** DTO tin nhắn support đã loại bỏ quan hệ JPA và dữ liệu nội bộ. */
public record SupportMessageResponse(Long id, SupportMessageSenderEnum senderType,
                                     SupportMessageTypeEnum messageType, String content,
                                     String metadata, LocalDateTime createdAt) {
}
