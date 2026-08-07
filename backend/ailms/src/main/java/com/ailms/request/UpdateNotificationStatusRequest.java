package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * Request DTO để cập nhật trạng thái đọc của thông báo.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateNotificationStatusRequest {

    @NotNull(message = "isRead field is required")
    private Boolean isRead;
}
