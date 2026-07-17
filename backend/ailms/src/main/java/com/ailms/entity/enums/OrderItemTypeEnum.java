package com.ailms.entity.enums;

/**
 * Loại giao dịch trong đơn hàng.
 * NEW_PURCHASE : Mua mới.
 * UPGRADE      : Nâng cấp gói hoặc khóa học.
 * RENEWAL      : Gia hạn gói hoặc khóa học.
 */
public enum OrderItemTypeEnum {
    NEW_PURCHASE,
    UPGRADE,
    RENEWAL
}
