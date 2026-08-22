package com.ailms.response.support;

import com.ailms.entity.enums.SupportConversationStatusEnum;

import java.time.LocalDateTime;

/** DTO trạng thái queue/conversation để visitor khôi phục widget sau reload. */
public record SupportConversationResponse(Long id, SupportConversationStatusEnum status,
                                          Integer queuePosition, Integer estimatedWaitMinutes,
                                          boolean hasContact, String fullName, String email,
                                          LocalDateTime createdAt,
                                          String createdAtEpochMs,
                                          LocalDateTime startedAt, LocalDateTime endedAt,
                                          String requestCloseAvailableAtEpochMs,
                                          String autoCloseAtEpochMs,
                                          String assignedSupportName,
                                          String assignedSupportAvatarUrl) {
}
