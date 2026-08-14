package com.ailms.response.support;

/** Card/link catalog an toàn để visitor hoặc Support mở đúng trang public. */
public record SupportResourceResponse(String type, String id, String title, String subtitle,
                                      String imageUrl, String href) {
}
