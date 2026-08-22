package com.ailms.repository;

import com.ailms.entity.OrderEntity;
import com.ailms.entity.enums.OrderStatusEnum;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends BaseRepository<OrderEntity, Long> {
    List<OrderEntity> findByUserEntity_Id(Long userId);
    List<OrderEntity> findByStatus(OrderStatusEnum status);
    List<OrderEntity> findByStatusAndExpiredAtBefore(OrderStatusEnum status, LocalDateTime now);

    /** Lấy batch order thiếu hóa đơn thanh toán để job backfill MinIO. */
    List<OrderEntity> findTop20ByStatusAndPaymentInvoiceKeyIsNullOrderByCreatedAtAsc(OrderStatusEnum status);

    /** Lấy batch order hoàn tiền thiếu chứng từ refund để job backfill MinIO. */
    List<OrderEntity> findTop20ByStatusAndRefundInvoiceKeyIsNullOrderByCreatedAtAsc(OrderStatusEnum status);

    /** Khóa order trong lúc gọi refund để hai yêu cầu đồng thời không hoàn tiền hai lần. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM OrderEntity o WHERE o.id = :id")
    java.util.Optional<OrderEntity> findByIdForUpdate(@Param("id") Long id);

    /** Tìm các PENDING order còn hiệu lực của user có chứa ít nhất một trong danh sách packageId; dùng để cancel trước khi tạo checkout mới. */
    @Query("""
        SELECT DISTINCT o FROM OrderEntity o
        JOIN o.items item
        WHERE o.userEntity.id = :userId
          AND o.status = com.ailms.entity.enums.OrderStatusEnum.PENDING
          AND (o.expiredAt IS NULL OR o.expiredAt > :now)
          AND item.coursePackageEntity.id IN :packageIds
        """)
    List<OrderEntity> findActivePendingOrdersByUserAndPackages(
            @Param("userId") Long userId,
            @Param("packageIds") List<Long> packageIds,
            @Param("now") LocalDateTime now);
}
