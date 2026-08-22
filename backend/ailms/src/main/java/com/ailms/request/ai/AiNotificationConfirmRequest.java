package com.ailms.request.ai;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Xác nhận rõ ràng của Admin trước khi thực thi draft thông báo do AI tạo. */
@Data
public class AiNotificationConfirmRequest {

    @NotBlank(message = "Cần xác nhận gửi thông báo")
    @Pattern(regexp = "SEND_NOTIFICATION", message = "confirm phải là SEND_NOTIFICATION")
    private String confirm;
}
