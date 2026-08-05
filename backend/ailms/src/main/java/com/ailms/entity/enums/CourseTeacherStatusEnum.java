package com.ailms.entity.enums;

/**
 * Trạng thái phân công giảng viên vào khóa học.
 * PENDING  : Lời mời đang chờ giảng viên xác nhận
 * ACTIVE   : Giảng viên chính thức (Đã đồng ý)
 * REJECTED : Giảng viên từ chối lời mời
 * INACTIVE : Đã thu hồi lời mời / Tạm dừng
 */
public enum CourseTeacherStatusEnum {
    PENDING,
    ACTIVE,
    REJECTED,
    INACTIVE
}
