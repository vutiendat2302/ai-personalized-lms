package com.ailms.request.support;

import jakarta.validation.constraints.NotNull;

/** Payload trạng thái đang nhập gửi qua STOMP, không lưu vào lịch sử tin nhắn. */
public record SupportTypingSocketMessage(@NotNull Boolean typing) {
}
