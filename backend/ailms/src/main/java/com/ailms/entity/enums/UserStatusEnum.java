package com.ailms.entity.enums;

/**
 * Trạng thái tài khoản người dùng trong hệ thống.
 * INACTIVE             : Tài khoản chưa được kích hoạt.
 * ACTIVE               : Tài khoản đã được kích hoạt và có thể sử dụng hệ thống.
 * LOCKED               : Tài khoản bị khóa, không được phép đăng nhập.
 * PENDING_VERIFICATION : Đang chờ người dùng xác thực OTP để hoàn tất đăng ký.
 * DELETED              : Tài khoản đã bị xóa mềm (soft delete).
 */
public enum UserStatusEnum {

    INACTIVE,

    ACTIVE,

    LOCKED,

    PENDING_VERIFICATION,

    DELETED
}

