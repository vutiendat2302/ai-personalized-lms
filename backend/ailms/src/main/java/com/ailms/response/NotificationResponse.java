package com.ailms.response;

import com.ailms.entity.enums.NotificationSourceEnum;
import com.ailms.entity.enums.NotificationTypeEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

/**
 * DTO phản hồi chi tiết thông báo.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {

    private Long id;

    /** ID người nhận thông báo. */
    private Long userId;

    /** ID Admin khởi tạo (null nếu source = SYSTEM). */
    private Long createdById;

    /** Tên đầy đủ của Admin khởi tạo (null nếu source = SYSTEM). */
    private String createdByName;

    /** Nguồn gốc thông báo: ADMIN hoặc SYSTEM. */
    private NotificationSourceEnum source;

    /** Loại thông báo để FE render icon/route. */
    private NotificationTypeEnum type;

    private String title;
    private String content;

    /** ID đối tượng liên quan (dùng FE tự build route nội bộ). */
    private Long targetId;

    /** URL điều hướng tùy chỉnh / external link. */
    private String targetUrl;

    /** Trạng thái đã đọc. */
    private boolean isRead;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime readAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
