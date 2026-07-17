package com.ailms.entity.enums;

/**
 * Trạng thái điểm danh của nhân viên trong một ca làm việc
 * PRESENT: có mặt và làm việc đúng quy định
 * LATE: Có mặt nhưng đến muộn so với quy định
 * ABSENT: vắng mặt, không tham gia
 * ON_LEAVE: nghỉ phép được phê duyệt
 * HALF_DAY: làm việc nửa ngày
 * INVALID: Dữ liệu điểm danh không hợp lệ, không thể xác định
 * CANCELLED: Đã bị hủy
 */
public enum AttendanceStatusEnum {
    PRESENT,
    LATE,
    ABSENT,
    ON_LEAVE,
    HALF_DAY,
    INVALID,
    CANCELLED
}
