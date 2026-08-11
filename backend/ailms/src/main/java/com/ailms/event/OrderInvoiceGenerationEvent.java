package com.ailms.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/** Yêu cầu tạo chứng từ order sau khi transaction thanh toán hoặc hoàn tiền đã commit. */
@Getter
public class OrderInvoiceGenerationEvent extends ApplicationEvent {
    private final Long orderId;
    private final boolean refund;

    /** Tạo event phân biệt hóa đơn thanh toán và chứng từ hoàn tiền. */
    public OrderInvoiceGenerationEvent(Object source, Long orderId, boolean refund) {
        super(source);
        this.orderId = orderId;
        this.refund = refund;
    }
}
