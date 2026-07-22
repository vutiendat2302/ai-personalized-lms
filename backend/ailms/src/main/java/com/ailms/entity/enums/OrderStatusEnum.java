package com.ailms.entity.enums;

/**
 * Trạng thái xử lý của đơn hàng.
 * PENDING   : Đang chờ thanh toán.
 * PAID      : Đã thanh toán thành công.
 * CANCELLED : Đã hủy.
 * EXPIRED   : Hết hạn thanh toán.
 * REFUNDED  : Đã hoàn tiền.
 */
public enum OrderStatusEnum implements Transitionable<OrderStatusEnum> {
    PENDING,
    PAID,
    CANCELLED,
    EXPIRED,
    REFUNDED;

    @Override
    public boolean canTransitionTo(OrderStatusEnum target) {
        switch (this) {
            case PENDING:
                return target == PAID || target == CANCELLED || target == EXPIRED;
            case PAID:
                return target == REFUNDED;
            default:
                return false;
        }
    }
}
