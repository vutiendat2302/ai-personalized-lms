package com.ailms.request.ai;

import lombok.*;

import java.util.List;
import java.util.Map;

/** Payload nội bộ để Backend chủ động đồng bộ tài liệu sang RAG. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiIngestRequest {
    private String sourceId;
    private String sourceType;
    private String content;
    private String fileBase64;
    private String mimeType;
    private String module;
    private String domain;
    private List<String> allowedRoles;
    private Map<String, Object> metadata;
    private String courseId;
    private String sectionId;
    private String lessonId;
}
