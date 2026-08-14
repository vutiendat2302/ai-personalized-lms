package com.ailms.event;

import com.ailms.response.support.SupportMessageResponse;

/** Event phát realtime sau khi một tin nhắn support đã được lưu thành công. */
public record SupportMessageCreatedEvent(Long conversationId, String supportUsername,
                                         SupportMessageResponse message) {
}
