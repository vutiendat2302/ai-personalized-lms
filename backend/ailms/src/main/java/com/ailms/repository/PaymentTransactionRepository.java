package com.ailms.repository;

import com.ailms.entity.PaymentTransactionEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends BaseRepository<PaymentTransactionEntity, Long> {
    List<PaymentTransactionEntity> findByOrderEntity_Id(Long orderId);
    Optional<PaymentTransactionEntity> findByTransactionRef(String transactionRef);
}
