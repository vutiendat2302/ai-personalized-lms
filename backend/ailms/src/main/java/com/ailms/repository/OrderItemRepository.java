package com.ailms.repository;

import com.ailms.entity.OrderItemEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends BaseRepository<OrderItemEntity, Long> {
    List<OrderItemEntity> findByOrderEntity_Id(Long orderId);
}
