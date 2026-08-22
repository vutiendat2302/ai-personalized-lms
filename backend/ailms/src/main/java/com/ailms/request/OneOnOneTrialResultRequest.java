package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

/** Lựa chọn tiếp tục hoặc tìm người dạy khác sau buổi thử. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OneOnOneTrialResultRequest {
    @NotNull(message = "continueLearning is required")
    private Boolean continueLearning;
}
