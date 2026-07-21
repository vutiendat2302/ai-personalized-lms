package com.ailms.entity.enums;

/**
 * Trạng thái chung của một thực thể trong hệ thống.
 * ACTIVE           : Đang hoạt động và có thể sử dụng.
 * INACTIVE         : Đã ngừng hoạt động hoặc tạm thời bị vô hiệu hóa.
 * DRAFT            : Đang ở trạng thái nháp, chưa được hoàn thiện.
 * PENDING          : Đang chờ phê duyệt.
 * REJECTED         : Đã bị từ chối trong quá trình phê duyệt.
 * EXPIRED          : Đã hết hạn.
 * UNASSIGNED       : Đã bị hủy gán.
 * DELETE           : Đã bị xóa khỏi hệ thống.
 */
public enum BaseStatusEnum {
    ACTIVE,
    INACTIVE,
    DRAFT,
    PENDING,
    REJECTED,
    EXPIRED,
    UNASSIGNED,
    DELETE
}
