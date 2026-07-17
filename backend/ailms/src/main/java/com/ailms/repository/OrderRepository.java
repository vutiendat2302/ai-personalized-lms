package com.ailms.repository;

import com.ailms.entity.OrderEntity;
import com.ailms.entity.enums.OrderStatusEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends BaseRepository<OrderEntity, Long> {
    List<OrderEntity> findByUserEntity_Id(Long userId);
    List<OrderEntity> findByStatus(OrderStatusEnum status);
    List<OrderEntity> findByStatusAndExpiredAtBefore(OrderStatusEnum status, LocalDateTime now);
}
