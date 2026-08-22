package com.ailms.response.ai;

import lombok.Data;

/** Kết quả ingestion đồng bộ trả số chunk đã ghi vào Qdrant. */
@Data
public class AiIngestResponse {
    private String status;
    private Integer chunksCount;
    private String sourceType;
}
