package com.ailms.controller;

import com.ailms.exception.ForbiddenException;
import com.ailms.request.CreateAdminNotificationRequest;
import com.ailms.request.UpdateNotificationStatusRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.NotificationResponse;
import com.ailms.response.NotificationUnreadCountResponse;
import com.ailms.response.PageResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.INotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${api.prefix}/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final INotificationService notificationService;

    /**
     * Admin tạo và gửi thông báo thủ công.
     *
     * <ul>
     *   <li>Gửi tới danh sách user cụ thể (userIds): trả về 201 Created ngay.</li>
     *   <li>Gửi broadcast/theo role: trả về 202 Accepted, xử lý async.</li>
     * </ul>
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> createAdminNotification(
            @Valid @RequestBody CreateAdminNotificationRequest request) {
        Long adminUserId = getCurrentUserId();

        boolean isAsync = Boolean.TRUE.equals(request.getBroadcastAll())
                || (request.getTargetRole() != null && !request.getTargetRole().trim().isEmpty());

        notificationService.processAdminNotification(adminUserId, request);

        if (isAsync) {
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(ApiResponse.message("Thông báo đang được gửi trong nền, vui lòng chờ."));
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.message("Thông báo đã được gửi thành công."));
    }

    /**
     * Lấy danh sách thông báo của user đang đăng nhập (phân trang).
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<NotificationResponse>>> getUserNotifications(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        Long userId = getCurrentUserId();
        PageResponse<NotificationResponse> response = notificationService.getUserNotifications(userId, page, size);
        return ResponseEntity.ok(ApiResponse.of("Notifications retrieved successfully", response));
    }

    /**
     * Lấy số lượng thông báo chưa đọc của user đang đăng nhập.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<NotificationUnreadCountResponse>> getUnreadCount() {
        Long userId = getCurrentUserId();
        NotificationUnreadCountResponse response = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(ApiResponse.of("Unread count retrieved successfully", response));
    }

    /**
     * Lấy chi tiết thông báo và tự động đánh dấu đã đọc.
     * Kiểm tra quyền sở hữu (IDOR prevention).
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NotificationResponse>> getNotificationDetail(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        NotificationResponse response = notificationService.getNotificationDetail(userId, id);
        return ResponseEntity.ok(ApiResponse.of("Notification detail retrieved successfully", response));
    }

    /**
     * Cập nhật trạng thái đọc/chưa đọc của thông báo.
     * Kiểm tra quyền sở hữu (IDOR prevention).
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<NotificationResponse>> updateNotificationStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateNotificationStatusRequest request) {
        Long userId = getCurrentUserId();
        NotificationResponse response = notificationService.updateNotificationStatus(userId, id, request);
        return ResponseEntity.ok(ApiResponse.of("Notification status updated successfully", response));
    }

    /**
     * Đánh dấu tất cả thông báo của user đang đăng nhập là đã đọc.
     */
    @PatchMapping("/mark-all-read")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        Long userId = getCurrentUserId();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(ApiResponse.message("Tất cả thông báo đã được đánh dấu là đã đọc."));
    }

    /**
     * Xóa thông báo.
     * Kiểm tra quyền sở hữu (IDOR prevention).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        notificationService.deleteNotification(userId, id);
        return ResponseEntity.ok(ApiResponse.message("Notification deleted successfully"));
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails userDetails) {
                return userDetails.getUser().getId();
            }
        }
        throw new ForbiddenException("Yêu cầu đăng nhập để thực hiện thao tác này.");
    }
}
