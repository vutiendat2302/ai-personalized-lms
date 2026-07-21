package com.ailms.entity.enums;

/**
 * Trạng thái đơn nghỉ phép:
 * PENDING  : Đang chờ duyệt
 * APPROVED : Đã được phê duyệt (có lương / đúng chế độ)
 * REJECTED : Bị từ chối
 * UNPAID   : Nghỉ không lương (khi vượt quá số ngày phép năm)
 * CANCELLED: Đã hủy
 */
public enum LeaveStatusEnum {
    PENDING,
    APPROVED,
    REJECTED,
    UNPAID,
    CANCELLED
}
