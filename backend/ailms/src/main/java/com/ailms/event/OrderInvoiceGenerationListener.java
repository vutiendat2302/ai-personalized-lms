package com.ailms.event;

import com.ailms.service.IInvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Tạo và lưu PDF MinIO sau commit để lỗi storage không rollback giao dịch cổng thanh toán. */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderInvoiceGenerationListener {
    private final IInvoiceService invoiceService;

    /** Xử lý idempotent yêu cầu lưu hóa đơn tương ứng của order. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(OrderInvoiceGenerationEvent event) {
        try {
            if (event.isRefund()) {
                invoiceService.storeRefundInvoice(event.getOrderId());
            } else {
                invoiceService.storePaymentInvoice(event.getOrderId());
            }
        } catch (Exception exception) {
            log.error("Could not store {} invoice for order {}",
                    event.isRefund() ? "refund" : "payment", event.getOrderId(), exception);
        }
    }
}
