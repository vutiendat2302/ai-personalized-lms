package com.ailms.exception;

public class TokenExpiredException extends RuntimeException {
    public TokenExpiredException(String message) {
        super(message);
    }

    public static TokenExpiredException of (String name, String value) {
        return new TokenExpiredException(name + " is expired with: " + value);
    }
}
