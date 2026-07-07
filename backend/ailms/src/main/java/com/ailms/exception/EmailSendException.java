package com.ailms.exception;

public class EmailSendException extends RuntimeException {
    public EmailSendException(String message) {
        super(message);
    }

    public EmailSendException(String message, Throwable cause) {
        super(message, cause);
    }

    public static EmailSendException of (String email) {
        return new EmailSendException("Khong the gui email" + email);
    }
}
