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

    /** Khóa giao dịch theo order ID phía cổng thanh toán khi capture. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT p FROM PaymentTransactionEntity p WHERE p.gatewayOrderId = :gatewayOrderId")
    Optional<PaymentTransactionEntity> findByGatewayOrderIdForUpdate(
            @org.springframework.data.repository.query.Param("gatewayOrderId") String gatewayOrderId);

    /** Kiểm tra PayPal capture ID đã được dùng cho giao dịch khác. */
    boolean existsByPaypalCaptureId(String paypalCaptureId);

    /** Kiểm tra request ID idempotent PayPal đã tồn tại. */
    boolean existsByPaypalRequestId(String paypalRequestId);

    /** Lấy giao dịch PayPal theo capture ID đã xác minh. */
    Optional<PaymentTransactionEntity> findByPaypalCaptureId(String paypalCaptureId);

    /** Khóa transaction đã capture trong lúc PayPal xử lý refund. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT p FROM PaymentTransactionEntity p WHERE p.paypalCaptureId = :captureId")
    Optional<PaymentTransactionEntity> findByPaypalCaptureIdForUpdate(
            @org.springframework.data.repository.query.Param("captureId") String captureId);

    /** Kiểm tra PayPal refund ID chưa được gán sang transaction khác. */
    boolean existsByPaypalRefundId(String paypalRefundId);
}
