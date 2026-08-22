package com.ailms.request.support;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Tin nhắn tự do chỉ hợp lệ khi conversation đã ACTIVE với HR. */
public record SupportMessageRequest(@NotBlank @Size(max = 2000) String content) {
}
