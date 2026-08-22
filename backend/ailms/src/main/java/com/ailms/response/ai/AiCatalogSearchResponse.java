package com.ailms.response.ai;

import lombok.*;

import java.util.Map;

/** Kết quả semantic catalog gồm ID nguồn và điểm cosine similarity. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiCatalogSearchResponse {
    String id;
    double score;
    Map<String, Object> metadata;
}
