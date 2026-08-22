package com.ailms.response.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Kết quả đồng bộ một nhóm tri thức quản trị không nhạy cảm sang RAG. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiKnowledgeSyncResponse {
    private String knowledgeType;
    private int sourcesSynced;
}
