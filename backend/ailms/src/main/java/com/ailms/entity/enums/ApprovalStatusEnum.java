package com.ailms.entity.enums;

/**
 * Trạng thái xử lý của một yêu cầu/phê duyệt trong hệ thống.
 * PENDING   : Đang chờ xét duyệt.
 * CONFIRMED  : Đã được phê duyệt.
 * REJECTED  : Đã bị từ chối.
 * CANCELLED : Đã bị hủy.
 */
public enum ApprovalStatusEnum {
    PENDING,
    CONFIRMED,
    REJECTED,
    CANCELLED
}
