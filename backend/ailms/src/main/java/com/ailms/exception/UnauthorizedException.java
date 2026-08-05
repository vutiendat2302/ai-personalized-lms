package com.ailms.exception;

/**
 * Bắt lỗi chưa đăng nhập, chưa xác thực
 */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
