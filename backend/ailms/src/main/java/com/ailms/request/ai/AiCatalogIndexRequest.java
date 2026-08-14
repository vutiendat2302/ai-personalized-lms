package com.ailms.request.ai;

import lombok.*;

import java.util.Map;

/** Payload nội bộ để AI Service tạo embedding catalog công khai. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiCatalogIndexRequest {
    String sourceId;
    String entityType;
    String text;
    Map<String, Object> metadata;
}
