package com.ailms.response.support;

/** Quick reply do backend kiểm soát, frontend không gửi nguyên label lên AI. */
public record SupportOptionResponse(String id, String label, String actionType) {
}
