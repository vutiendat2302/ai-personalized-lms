package com.ailms.repository;

import com.ailms.entity.OrderItemEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDateTime;

@Repository
public interface OrderItemRepository extends BaseRepository<OrderItemEntity, Long> {
    List<OrderItemEntity> findByOrderEntity_Id(Long orderId);

    /** Kiểm tra người dùng đã có checkout PENDING còn hiệu lực cho cùng gói. */
    @org.springframework.data.jpa.repository.Query("""
        SELECT CASE WHEN COUNT(item) > 0 THEN true ELSE false END
        FROM OrderItemEntity item
        WHERE item.orderEntity.userEntity.id = :userId
          AND item.coursePackageEntity.id = :packageId
          AND item.orderEntity.status = com.ailms.entity.enums.OrderStatusEnum.PENDING
          AND (item.orderEntity.expiredAt IS NULL OR item.orderEntity.expiredAt > :now)
        """)
    boolean existsActivePendingCheckout(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("packageId") Long packageId,
            @org.springframework.data.repository.query.Param("now") LocalDateTime now);
}
