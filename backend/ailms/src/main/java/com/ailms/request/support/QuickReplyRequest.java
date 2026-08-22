package com.ailms.request.support;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Chỉ nhận optionId đã được backend công bố, không nhận nhãn tùy ý từ client. */
public record QuickReplyRequest(@NotBlank @Size(max = 80) String optionId,
                                @Size(max = 80) String value) {
}
