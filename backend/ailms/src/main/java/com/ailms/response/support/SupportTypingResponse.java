package com.ailms.response.support;

import com.ailms.entity.enums.SupportMessageSenderEnum;

/** Event typing tạm thời để đầu còn lại hiển thị đúng người đang nhập. */
public record SupportTypingResponse(SupportMessageSenderEnum senderType, boolean typing) {
}
