package com.ailms.entity.enums;
/**
 * Trạng thái giao dịch thanh toán.
 * PENDING : Đang chờ xử lý.
 * SUCCESS : Thanh toán thành công.
 * FAILED  : Thanh toán thất bại.
 * REFUNDED: PayPal đã hoàn lại toàn bộ giao dịch.
 */
public enum PaymentTransactionStatusEnum implements Transitionable<PaymentTransactionStatusEnum> {
    PENDING,
    SUCCESS,
    FAILED,
    REFUNDED;

    @Override
    public boolean canTransitionTo(PaymentTransactionStatusEnum target) {
        switch (this) {
            case PENDING:
                return target == SUCCESS || target == FAILED;
            case SUCCESS:
                return target == REFUNDED;
            default:
                return false;
        }
    }
}
