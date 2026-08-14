package com.ailms.response.support;

/** Payload thông báo tin nhắn mới kèm conversation ID cho màn hình Support. */
public record SupportMessageNotificationResponse(String conversationId, SupportMessageResponse message) {
}
