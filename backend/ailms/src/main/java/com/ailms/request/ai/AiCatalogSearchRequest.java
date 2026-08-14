package com.ailms.request.ai;

import lombok.*;

import java.util.Map;

/** Payload nội bộ để tìm catalog theo semantic similarity. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiCatalogSearchRequest {
    String query;
    String entityType;
    int limit;
    Map<String, Object> filters;
}
