package com.ailms.exception;

// Cu phap - format nhap khong hop le
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
