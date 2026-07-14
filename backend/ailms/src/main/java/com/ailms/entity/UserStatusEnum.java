package com.ailms.entity;

public enum UserStatusEnum {
    /**
     * Tài khoản chưa được kích hoạt.
     */
    INACTIVE,

    /**
     * Tài khoản đã được kích hoạt và có thể sử dụng hệ thống.
     */
    ACTIVE,

    /**
     * Tài khoản bị khóa, không được phép đăng nhập.
     */
    LOCKED,

    /**
     * Tài khoản đang chờ người dùng xác thực OTP để hoàn tất đăng ký.
     */
    PENDING_VERIFICATION,

    /**
     * Tài khoản đã bị xóa (soft delete).
     */
    DELETED
}

