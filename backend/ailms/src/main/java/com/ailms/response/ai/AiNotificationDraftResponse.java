package com.ailms.response.ai;

import lombok.Builder;
import lombok.Data;

/** Bản nháp thông báo do AI đề xuất, chưa hề được gửi cho bất kỳ người dùng nào. */
@Data
@Builder
public class AiNotificationDraftResponse {
    private String draftId;
    private String title;
    private String content;
    private String targetSummary;
    private String expiresAt;
    private boolean requiresConfirmation;
}
