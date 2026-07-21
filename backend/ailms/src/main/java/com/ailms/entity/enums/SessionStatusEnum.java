package com.ailms.entity.enums;

/**
 * Trạng thái của phiên học (learning_session):
 * ACTIVE           : Đang diễn ra
 * CLOSED           : Đã kết thúc bình thường (qua beacon hoặc end request)
 * IDLE_TIMEOUT     : Đóng do không có tương tác người dùng (> 10-12 phút)
 * HEARTBEAT_TIMEOUT: Đóng do mất kết nối / quá 90s không nhận heartbeat
 */
public enum SessionStatusEnum {
    ACTIVE,
    CLOSED,
    IDLE_TIMEOUT,
    HEARTBEAT_TIMEOUT,
    BEACON_CLOSED
}
