package com.ailms.job;

import com.ailms.entity.enums.OrderStatusEnum;
import com.ailms.repository.OrderRepository;
import com.ailms.service.IInvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Backfill theo batch các hóa đơn cũ hoặc lần upload MinIO trước đó bị lỗi. */
@Component
@RequiredArgsConstructor
@Slf4j
public class InvoiceBackfillJob {
    private final OrderRepository orderRepository;
    private final IInvoiceService invoiceService;

    /** Mỗi năm phút thử lại tối đa từng batch 20 order cho mỗi loại chứng từ. */
    @Scheduled(initialDelay = 30000, fixedDelay = 300000)
    public void backfillMissingInvoices() {
        orderRepository.findTop20ByStatusAndPaymentInvoiceKeyIsNullOrderByCreatedAtAsc(OrderStatusEnum.PAID)
                .forEach(order -> storePayment(order.getId()));
        orderRepository.findTop20ByStatusAndPaymentInvoiceKeyIsNullOrderByCreatedAtAsc(OrderStatusEnum.REFUNDED)
                .forEach(order -> storePayment(order.getId()));
        orderRepository.findTop20ByStatusAndRefundInvoiceKeyIsNullOrderByCreatedAtAsc(OrderStatusEnum.REFUNDED)
                .forEach(order -> storeRefund(order.getId()));
    }

    /** Thử lưu hóa đơn thanh toán và giữ job tiếp tục nếu một order lỗi. */
    private void storePayment(Long orderId) {
        try {
            invoiceService.storePaymentInvoice(orderId);
        } catch (Exception exception) {
            log.warn("Payment invoice backfill failed for order {}: {}", orderId, exception.getMessage());
        }
    }

    /** Thử lưu chứng từ hoàn tiền và giữ job tiếp tục nếu một order lỗi. */
    private void storeRefund(Long orderId) {
        try {
            invoiceService.storeRefundInvoice(orderId);
        } catch (Exception exception) {
            log.warn("Refund invoice backfill failed for order {}: {}", orderId, exception.getMessage());
        }
    }
}
