package com.ailms.exception;

// Token khong hop le
public class InvalidTokenException extends RuntimeException {
    public InvalidTokenException(String message) {
        super(message);
    }

    public static InvalidTokenException of (String name, String value) {
        return new InvalidTokenException(name + " is invalid with:" + value);
    }
}
