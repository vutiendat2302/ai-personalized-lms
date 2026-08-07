package com.ailms.response;

import lombok.*;

/**
 * DTO phản hồi số lượng thông báo chưa đọc của user.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationUnreadCountResponse {

    private long unreadCount;
}
