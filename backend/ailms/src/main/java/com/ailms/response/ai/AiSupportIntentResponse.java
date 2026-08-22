package com.ailms.response.ai;

/** Intent quick reply cùng điểm cosine do AI Service local embedding trả về. */
public record AiSupportIntentResponse(String optionId, double score) {
}
