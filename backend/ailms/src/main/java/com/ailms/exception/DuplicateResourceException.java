package com.ailms.exception;

public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) {
        super(message);
    }
    public static DuplicateResourceException of (String resourceName, String field, String value) {
        return new DuplicateResourceException(resourceName + " already exists with " + field + ": " + value);
    }
}
