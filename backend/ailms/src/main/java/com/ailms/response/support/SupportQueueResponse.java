package com.ailms.response.support;

import java.util.List;

/** Danh sách queue dành cho HR, kèm thông tin liên hệ cần thiết để gọi lại. */
public record SupportQueueResponse(List<SupportConversationResponse> conversations) {
}
