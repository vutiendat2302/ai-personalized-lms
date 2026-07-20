package com.ailms.entity.enums;

/**
 * Trạng thái thanh toán của buổi học.
 * PENDING   : Chưa được xác nhận.
 * CONFIRMED : Đã được xác nhận.
 * PAID      : Đã thanh toán.
 * DELETE    : Đã đánh dấu xóa.
 * CANCELLED : Đã hủy.
 */
public enum SessionPaymentStatusEnum {
    DRAFT,
    PENDING,
    CONFIRMED,
    PAID,
    DELETE,
    CANCELLED
}
