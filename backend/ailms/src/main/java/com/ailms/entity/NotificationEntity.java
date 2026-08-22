package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.NotificationSourceEnum;
import com.ailms.entity.enums.NotificationTypeEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ thông báo trong hệ thống.
 *
 * <p>Hỗ trợ hai nguồn gốc:
 * <ul>
 *   <li>{@code ADMIN}: Quản trị viên chủ động tạo và gửi.</li>
 *   <li>{@code SYSTEM}: Hệ thống tự động phát sinh khi xảy ra sự kiện nghiệp vụ.</li>
 * </ul>
 *
 * <p>Index composite {@code (user_id, is_read, created_at)} tối ưu truy vấn
 * "lấy thông báo chưa đọc của user sắp xếp theo thời gian mới nhất".
 */
@Entity
@Table(name = "notification", indexes = {
        @Index(name = "idx_noti_user_read_created", columnList = "user_id, is_read, created_at DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class NotificationEntity extends BaseEntity {

    /** Mã định danh thông báo (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Người nhận thông báo. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    /**
     * Admin khởi tạo thông báo khi {@code source = ADMIN}.
     * Dùng cột {@code created_by_admin_id} để tránh xung đột với
     * {@code BaseEntity.createdBy} (cột {@code created_by}).
     * Giá trị {@code null} khi {@code source = SYSTEM}.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_admin_id")
    private UserEntity createdByAdmin;

    /** Nguồn gốc thông báo (ADMIN hoặc SYSTEM). */
    @Column(name = "source", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private NotificationSourceEnum source = NotificationSourceEnum.SYSTEM;

    /** Loại thông báo chi tiết dùng để FE render icon và route. */
    @Column(name = "type", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private NotificationTypeEnum type = NotificationTypeEnum.GENERAL;

    /** Tiêu đề thông báo. */
    @Column(name = "title", nullable = false, length = 255)
    private String title;

    /**
     * Nội dung chi tiết thông báo.
     * Sử dụng {@code TEXT} để tránh bị cắt bởi giới hạn VARCHAR(255).
     */
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    /**
     * ID đối tượng liên quan, dùng để FE tự xây dựng route nội bộ.
     * Ví dụ: courseId, orderId, reportId...
     */
    @Column(name = "target_id")
    private Long targetId;

    /**
     * URL điều hướng khi click vào thông báo.
     * Ưu tiên dùng khi cần override link tùy chỉnh hoặc liên kết ngoài.
     */
    @Column(name = "target_url", length = 500)
    private String targetUrl;

    /**
     * Trạng thái đã đọc.
     * Dùng kiểu nguyên thủy {@code boolean} để tránh NPE khi unbox.
     */
    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    /**
     * Thời điểm người dùng đọc thông báo.
     * Được set khi {@code isRead = true}, đặt lại {@code null} khi {@code isRead = false}.
     */
    @Column(name = "read_at")
    private LocalDateTime readAt;
}
