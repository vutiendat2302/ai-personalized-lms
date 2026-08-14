package com.ailms.response.support;

/** Token visitor và conversation ID trả một lần để client không nhầm hai loại ID. */
public record VisitorSessionResponse(String visitorId, String visitorToken, String conversationId) {
}
