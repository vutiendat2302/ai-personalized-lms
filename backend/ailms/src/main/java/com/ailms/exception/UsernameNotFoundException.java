package com.ailms.exception;

public class UsernameNotFoundException extends org.springframework.security.core.userdetails.UsernameNotFoundException {
    public UsernameNotFoundException(String message) {
        super(message);
    }

    public static UsernameNotFoundException of (String usernameOrEmail, String value) {
        return new UsernameNotFoundException(usernameOrEmail + " not found with: " + value);
    }

}
