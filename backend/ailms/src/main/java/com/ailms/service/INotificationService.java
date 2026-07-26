package com.ailms.service;

import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.NotificationTypeEnum;
import com.ailms.request.CreateAdminNotificationRequest;
import com.ailms.request.UpdateNotificationStatusRequest;
import com.ailms.response.NotificationResponse;
import com.ailms.response.NotificationUnreadCountResponse;
import com.ailms.response.PageResponse;

public interface INotificationService {

    /**
     * Admin tạo thông báo thủ công.
     * Với userIds: tạo đồng bộ, trả về 201 Created.
     * Với broadcastAll/targetRole: xử lý async, trả về thông báo 202 Accepted.
     */
    void processAdminNotification(Long adminUserId, CreateAdminNotificationRequest request);

    /**
     * Hệ thống tạo thông báo nội bộ khi có sự kiện nghiệp vụ (event-driven).
     * Không đi qua REST API controller.
     */
    NotificationResponse createSystemNotification(
            UserEntity recipientUser,
            NotificationTypeEnum type,
            String title,
            String content,
            Long targetId,
            String targetUrl
    );

    /**
     * Lấy danh sách thông báo của user theo phân trang.
     * Sắp xếp theo thời gian tạo mới nhất.
     */
    PageResponse<NotificationResponse> getUserNotifications(Long userId, int page, int size);

    /**
     * Lấy chi tiết thông báo và tự động đánh dấu đã đọc.
     * Kiểm tra quyền sở hữu (IDOR prevention).
     */
    NotificationResponse getNotificationDetail(Long userId, Long notificationId);

    /**
     * Cập nhật trạng thái đọc của thông báo.
     * Tự đồng bộ readAt: set = now() khi isRead=true, set = null khi isRead=false.
     * Kiểm tra quyền sở hữu (IDOR prevention).
     */
    NotificationResponse updateNotificationStatus(Long userId, Long notificationId, UpdateNotificationStatusRequest request);

    /**
     * Đánh dấu tất cả thông báo chưa đọc của user thành đã đọc.
     */
    void markAllAsRead(Long userId);

    /**
     * Lấy số lượng thông báo chưa đọc của user.
     */
    NotificationUnreadCountResponse getUnreadCount(Long userId);

    /**
     * Xóa thông báo của user.
     * Kiểm tra quyền sở hữu (IDOR prevention).
     */
    void deleteNotification(Long userId, Long notificationId);
}
