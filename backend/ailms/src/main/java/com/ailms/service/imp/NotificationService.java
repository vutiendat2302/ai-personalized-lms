package com.ailms.service.imp;

import com.ailms.entity.NotificationEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.NotificationSourceEnum;
import com.ailms.entity.enums.NotificationTypeEnum;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.exception.ForbiddenException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.NotificationMapper;
import com.ailms.repository.NotificationRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.CreateAdminNotificationRequest;
import com.ailms.request.UpdateNotificationStatusRequest;
import com.ailms.response.NotificationResponse;
import com.ailms.response.NotificationUnreadCountResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.INotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class NotificationService implements INotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationMapper notificationMapper;

    /** Kích thước batch khi insert thông báo broadcast. */
    private static final int BATCH_SIZE = 500;

    // =====================================================================
    // Admin Notification
    // =====================================================================

    @Override
    @Transactional
    public void processAdminNotification(Long adminUserId, CreateAdminNotificationRequest request) {
        UserEntity admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> ResourceNotFoundException.of("Admin User", adminUserId));

        if (request.getUserIds() != null && !request.getUserIds().isEmpty()) {
            // Gửi tới danh sách user cụ thể — đồng bộ, không batch
            log.info("Admin {} creating targeted notification for {} users", adminUserId, request.getUserIds().size());
            List<NotificationEntity> notifications = new ArrayList<>();
            for (Long userId : request.getUserIds()) {
                UserEntity recipient = userRepository.findById(userId)
                        .orElseThrow(() -> ResourceNotFoundException.of("User", userId));
                notifications.add(buildAdminNotification(admin, recipient, request));
            }
            notificationRepository.saveAll(notifications);
            log.info("Saved {} targeted notifications", notifications.size());

        } else if (Boolean.TRUE.equals(request.getBroadcastAll())) {
            // Gửi broadcast — xử lý async
            log.info("Admin {} triggered broadcast notification", adminUserId);
            sendBroadcastAsync(admin, request);

        } else if (request.getTargetRole() != null) {
            // Gửi theo role — xử lý async
            log.info("Admin {} triggered role-targeted notification for role: {}", adminUserId, request.getTargetRole());
            sendRoleTargetedAsync(admin, request);
        }
    }

    /**
     * Gửi thông báo broadcast đến tất cả user active trong hệ thống.
     * Xử lý bất đồng bộ để tránh block HTTP request và timeout.
     * Chia thành batch 500 user/lần để tránh lock DB lâu.
     */
    @Async
    @Transactional
    public void sendBroadcastAsync(UserEntity admin, CreateAdminNotificationRequest request) {
        log.info("Starting async broadcast notification from admin {}", admin.getId());
        List<UserEntity> allActiveUsers = userRepository.findAllByStatusNot(UserStatusEnum.DELETED);
        processBatchNotifications(admin, allActiveUsers, request);
        log.info("Completed async broadcast to {} users", allActiveUsers.size());
    }

    /**
     * Gửi thông báo đến tất cả user có role cụ thể.
     * Xử lý bất đồng bộ.
     */
    @Async
    @Transactional
    public void sendRoleTargetedAsync(UserEntity admin, CreateAdminNotificationRequest request) {
        log.info("Starting async role-targeted notification for role: {} from admin {}", request.getTargetRole(), admin.getId());
        // Lấy danh sách user theo role thông qua join query
        List<UserEntity> targetUsers = userRepository.findUsersByRoleName(request.getTargetRole());
        processBatchNotifications(admin, targetUsers, request);
        log.info("Completed async role notification to {} users", targetUsers.size());
    }

    /**
     * Xử lý insert theo batch để tránh lock DB lâu.
     */
    private void processBatchNotifications(UserEntity admin, List<UserEntity> recipients, CreateAdminNotificationRequest request) {
        List<NotificationEntity> batch = new ArrayList<>(BATCH_SIZE);
        int total = 0;
        for (UserEntity recipient : recipients) {
            batch.add(buildAdminNotification(admin, recipient, request));
            if (batch.size() == BATCH_SIZE) {
                notificationRepository.saveAll(batch);
                total += batch.size();
                batch.clear();
                log.debug("Saved batch, total so far: {}", total);
            }
        }
        if (!batch.isEmpty()) {
            notificationRepository.saveAll(batch);
            total += batch.size();
        }
        log.info("Batch notification processing completed. Total saved: {}", total);
    }

    private NotificationEntity buildAdminNotification(UserEntity admin, UserEntity recipient, CreateAdminNotificationRequest request) {
        return NotificationEntity.builder()
                .user(recipient)
                .createdByAdmin(admin)
                .source(NotificationSourceEnum.ADMIN)
                .type(request.getType())
                .title(request.getTitle())
                .content(request.getContent())
                .targetId(request.getTargetId())
                .targetUrl(request.getTargetUrl())
                .isRead(false)
                .build();
    }

    // =====================================================================
    // System Notification (Internal / Event-Driven)
    // =====================================================================

    @Override
    @Transactional
    public NotificationResponse createSystemNotification(
            UserEntity recipientUser,
            NotificationTypeEnum type,
            String title,
            String content,
            Long targetId,
            String targetUrl) {
        log.info("Creating system notification for user {}: type={}, title={}", recipientUser.getId(), type, title);

        NotificationEntity entity = NotificationEntity.builder()
                .user(recipientUser)
                .source(NotificationSourceEnum.SYSTEM)
                .type(type)
                .title(title)
                .content(content)
                .targetId(targetId)
                .targetUrl(targetUrl)
                .isRead(false)
                .build();

        NotificationEntity saved = notificationRepository.save(entity);
        return notificationMapper.toResponse(saved);
    }

    // =====================================================================
    // User Notification Read Operations
    // =====================================================================

    @Override
    public PageResponse<NotificationResponse> getUserNotifications(Long userId, int page, int size) {
        log.info("Fetching notifications for user {} (page={}, size={})", userId, page, size);
        Page<NotificationEntity> entityPage = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
        Page<NotificationResponse> responsePage = entityPage.map(notificationMapper::toResponse);
        return PageResponse.from(responsePage);
    }

    @Override
    @Transactional
    public NotificationResponse getNotificationDetail(Long userId, Long notificationId) {
        log.info("User {} viewing notification detail {}", userId, notificationId);
        NotificationEntity entity = findAndVerifyOwnership(userId, notificationId);

        // Tự động đánh dấu đã đọc khi xem chi tiết
        if (!entity.isRead()) {
            entity.setRead(true);
            entity.setReadAt(LocalDateTime.now());
            notificationRepository.save(entity);
        }

        return notificationMapper.toResponse(entity);
    }

    @Override
    @Transactional
    public NotificationResponse updateNotificationStatus(Long userId, Long notificationId, UpdateNotificationStatusRequest request) {
        log.info("User {} updating notification {} isRead={}", userId, notificationId, request.getIsRead());
        NotificationEntity entity = findAndVerifyOwnership(userId, notificationId);

        boolean newStatus = request.getIsRead();
        entity.setRead(newStatus);
        // Đồng bộ readAt: set = now nếu isRead=true, set = null nếu isRead=false
        entity.setReadAt(newStatus ? LocalDateTime.now() : null);

        NotificationEntity saved = notificationRepository.save(entity);
        return notificationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        log.info("Marking all notifications as read for user {}", userId);
        int updated = notificationRepository.markAllAsRead(userId, LocalDateTime.now());
        log.info("Marked {} notifications as read for user {}", updated, userId);
    }

    @Override
    public NotificationUnreadCountResponse getUnreadCount(Long userId) {
        long count = notificationRepository.countByUserIdAndIsReadFalse(userId);
        return NotificationUnreadCountResponse.builder().unreadCount(count).build();
    }

    @Override
    @Transactional
    public void deleteNotification(Long userId, Long notificationId) {
        log.info("User {} deleting notification {}", userId, notificationId);
        NotificationEntity entity = findAndVerifyOwnership(userId, notificationId);
        notificationRepository.delete(entity);
    }

    // =====================================================================
    // Helper
    // =====================================================================

    /**
     * Tìm notification và kiểm tra quyền sở hữu.
     * Ném {@link ForbiddenException} nếu notification không thuộc về userId (IDOR prevention).
     */
    private NotificationEntity findAndVerifyOwnership(Long userId, Long notificationId) {
        NotificationEntity entity = notificationRepository.findById(notificationId)
                .orElseThrow(() -> ResourceNotFoundException.of("Notification", notificationId));

        if (!entity.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền truy cập thông báo này.");
        }

        return entity;
    }
}
