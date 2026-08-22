package com.ailms.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
    public static ResourceNotFoundException of (String resourceName, Object id) {
        return new ResourceNotFoundException(resourceName + " not found with id: " + id);
    }

    public static ResourceNotFoundException of (String resourceName) {
        return new ResourceNotFoundException(resourceName);
    }
}
