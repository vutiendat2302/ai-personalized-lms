package com.ailms.request.ai;

/** Contract Backend gửi quick action cùng context catalog/policy tin cậy sang AI Service. */
public record AiSupportQuickAnswerRequest(String optionId, String question, String context) {
}
