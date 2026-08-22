package com.ailms.request.support;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Payload text gửi qua STOMP sau khi quyền conversation đã được interceptor kiểm tra. */
public record SupportSocketMessage(@NotBlank @Size(max = 2000) String content) {
}
