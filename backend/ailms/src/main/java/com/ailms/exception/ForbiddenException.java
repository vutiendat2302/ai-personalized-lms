package com.ailms.exception;

// vao cac page khong có authenticate
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
