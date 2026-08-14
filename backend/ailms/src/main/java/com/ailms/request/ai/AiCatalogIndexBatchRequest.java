package com.ailms.request.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Batch payload nội bộ để backfill embedding catalog bằng local model. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiCatalogIndexBatchRequest {
    private List<AiCatalogIndexRequest> items;
}
