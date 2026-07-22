package com.ailms.entity.enums;

/**
 * Trạng thái bảng lương.
 * DRAFT    : Đang được tạo hoặc chỉnh sửa.
 * CONFIRMED : Đã được phê duyệt và sẵn sàng thanh toán.
 * PAID     : Đã thanh toán cho nhân viên.
 * PENDING  : Đang chờ phê duyệt hoặc xử lý.
 */
public enum SalaryStatusEnum {
    DRAFT,
    CONFIRMED,
    PAID,
    PENDING
}
