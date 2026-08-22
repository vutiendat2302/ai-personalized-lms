package com.ailms.entity.enums;

/**
 * Nguồn gốc tạo thông báo.
 * ADMIN  : Quản trị viên chủ động tạo và gửi thông báo.
 * SYSTEM : Hệ thống tự động phát sinh khi có sự kiện (event-driven).
 */
public enum NotificationSourceEnum {
    ADMIN,
    SYSTEM
}
