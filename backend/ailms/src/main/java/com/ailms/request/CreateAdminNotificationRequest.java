package com.ailms.request;

import com.ailms.entity.enums.NotificationTypeEnum;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

/**
 * Request DTO cho Admin tạo thông báo thủ công.
 *
 * <p>Bắt buộc chọn đúng một trong ba phương thức targeting:
 * <ul>
 *   <li>{@code userIds}: Gửi tới danh sách user cụ thể.</li>
 *   <li>{@code broadcastAll}: Gửi broadcast toàn bộ user active trong hệ thống (xử lý async).</li>
 *   <li>{@code targetRole}: Gửi tới tất cả user có role cụ thể (xử lý async).</li>
 * </ul>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateAdminNotificationRequest {

    @NotNull(message = "Notification type is required")
    private NotificationTypeEnum type;

    @NotBlank(message = "Title cannot be blank")
    @Size(max = 255, message = "Title cannot be longer than 255 characters")
    private String title;

    @NotBlank(message = "Content cannot be blank")
    private String content;

    /**
     * ID đối tượng liên quan (dùng để FE tự build route nội bộ).
     * Ví dụ: courseId, orderId...
     */
    private Long targetId;

    /**
     * URL điều hướng tùy chỉnh (ưu tiên khi cần override hoặc dùng external link).
     */
    @Size(max = 500, message = "Target URL cannot be longer than 500 characters")
    private String targetUrl;

    /** Gửi tới danh sách user ID cụ thể. */
    private List<Long> userIds;

    /** Gửi broadcast toàn bộ user active (xử lý async, API trả về 202 Accepted). */
    private Boolean broadcastAll;

    /** Gửi tới tất cả user có role cụ thể (VD: "EMPLOYEE", "STUDENT") (xử lý async). */
    private String targetRole;

    /**
     * Đảm bảo chỉ đúng 1 trong 3 phương thức targeting được set.
     * Tránh admin truyền nhầm gây gửi sai đối tượng.
     */
    @AssertTrue(message = "Chỉ được chọn 1 trong: userIds, broadcastAll, hoặc targetRole")
    private boolean isValidTargeting() {
        int count = 0;
        if (userIds != null && !userIds.isEmpty()) count++;
        if (Boolean.TRUE.equals(broadcastAll)) count++;
        if (targetRole != null && !targetRole.trim().isEmpty()) count++;
        return count == 1;
    }
}
