package com.ailms.entity.enums;
/**
 * Trạng thái giao dịch thanh toán.
 * PENDING : Đang chờ xử lý.
 * SUCCESS : Thanh toán thành công.
 * FAILED  : Thanh toán thất bại.
 */
public enum PaymentTransactionStatusEnum implements Transitionable<PaymentTransactionStatusEnum> {
    PENDING,
    SUCCESS,
    FAILED;

    @Override
    public boolean canTransitionTo(PaymentTransactionStatusEnum target) {
        switch (this) {
            case PENDING:
                return target == SUCCESS || target == FAILED;
            default:
                return false;
        }
    }
}
