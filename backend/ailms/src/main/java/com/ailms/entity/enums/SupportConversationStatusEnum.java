package com.ailms.entity.enums;

/** Trạng thái hợp lệ của một phiên tư vấn từ lúc guided chat đến khi đóng. */
public enum SupportConversationStatusEnum {
    GUIDED,
    COLLECTING_CONTACT,
    QUEUED,
    ASSIGNED,
    ACTIVE,
    WAITING_CONFIRMATION,
    CLOSED,
    CANCELLED,
    EXPIRED
}
