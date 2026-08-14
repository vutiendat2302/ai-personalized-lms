package com.ailms.repository;

import com.ailms.entity.NotificationEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import com.ailms.entity.enums.NotificationTypeEnum;

@Repository
public interface NotificationRepository extends BaseRepository<NotificationEntity, Long> {

    /**
     * Lấy danh sách thông báo của user sắp xếp theo thời gian tạo mới nhất.
     * Tận dụng index composite (user_id, is_read, created_at DESC).
     */
    Page<NotificationEntity> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /**
     * Đếm số thông báo chưa đọc của user.
     */
    long countByUserIdAndIsReadFalse(Long userId);

    /** Lấy activity notification mới nhất theo tập loại sự kiện. */
    Page<NotificationEntity> findByUserIdAndTypeInOrderByCreatedAtDesc(
            Long userId, Collection<NotificationTypeEnum> types, Pageable pageable);

    /** Chống tạo lặp cùng một sự kiện nghiệp vụ cho một người nhận. */
    boolean existsByUserIdAndTypeAndTargetId(Long userId, NotificationTypeEnum type, Long targetId);

    /**
     * Đánh dấu tất cả thông báo chưa đọc của user thành đã đọc.
     *
     * <p>{@code clearAutomatically = true}: Xóa Hibernate L1 Cache sau khi bulk update
     * để tránh trả về dữ liệu stale (isRead vẫn false) khi đọc lại trong cùng session.
     * <p>{@code flushAutomatically = true}: Flush pending changes trước khi execute query.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE NotificationEntity n SET n.isRead = true, n.readAt = :now WHERE n.user.id = :userId AND n.isRead = false")
    int markAllAsRead(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
