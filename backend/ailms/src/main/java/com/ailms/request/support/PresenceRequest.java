package com.ailms.request.support;

import com.ailms.entity.enums.SupportHrPresenceStatusEnum;
import jakarta.validation.constraints.NotNull;

/** Cập nhật trạng thái và heartbeat của HR. */
public record PresenceRequest(@NotNull SupportHrPresenceStatusEnum status) {
}
