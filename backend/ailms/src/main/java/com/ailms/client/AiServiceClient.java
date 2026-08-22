package com.ailms.client;

import com.ailms.request.ai.AiServiceChatRequest;
import com.ailms.request.ai.AiAssessmentGenerationRequest;
import com.ailms.request.ai.AiConversationTitleRequest;
import com.ailms.request.ai.AiIngestRequest;
import com.ailms.request.ai.InsightsRequest;
import com.ailms.request.ai.AiCatalogIndexRequest;
import com.ailms.request.ai.AiCatalogSearchRequest;
import com.ailms.request.ai.AiCatalogIndexBatchRequest;
import com.ailms.request.ai.AiSupportQuickAnswerRequest;
import com.ailms.request.ai.AiSupportIntentRequest;
import com.ailms.response.ai.AiCatalogSearchResponse;
import com.ailms.response.ai.InsightsResponse;
import com.ailms.response.ai.AiConversationTitleResponse;
import com.ailms.response.ai.AiAssessmentDraftResponse;
import com.ailms.response.ai.AiSupportQuickAnswerResponse;
import com.ailms.response.ai.AiSupportIntentResponse;
import com.ailms.response.ai.AiIngestResponse;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;
import org.springframework.web.service.annotation.DeleteExchange;
import org.springframework.web.bind.annotation.PathVariable;
import reactor.core.publisher.Flux;
import java.util.List;

/**
 * HTTP Client giao tiếp với ai-service.
 */
@HttpExchange
public interface AiServiceClient {

    /**
     * Gửi yêu cầu sinh văn bản test thử nghiệm từ ai-service.
     */
    @PostExchange("/test/generate")
    InsightsResponse getInsights(@RequestBody InsightsRequest request);

    /**
     * Stream phản hồi chat từ AI Service theo định dạng Server-Sent Events (SSE).
     */
    @PostExchange("/chat/stream")
    Flux<String> chatStream(@RequestBody AiServiceChatRequest request);

    /** Sinh câu trả lời quick action từ context public do Backend kiểm soát. */
    @PostExchange("/chat/support-answer")
    AiSupportQuickAnswerResponse answerSupportQuickAction(@RequestBody AiSupportQuickAnswerRequest request);

    /** Xếp hạng quick intent từ câu visitor bằng local vector embedding. */
    @PostExchange("/chat/support-intents")
    List<AiSupportIntentResponse> suggestSupportIntents(@RequestBody AiSupportIntentRequest request);

    /** Sinh quiz/assignment draft đã validate schema từ lesson context và source file tạm thời. */
    @PostExchange("/assessments/generate")
    AiAssessmentDraftResponse generateAssessment(@RequestBody AiAssessmentGenerationRequest request);

    /** Tạo tiêu đề một dòng cho hội thoại mới. */
    @PostExchange("/chat/title")
    AiConversationTitleResponse generateConversationTitle(
            @RequestBody AiConversationTitleRequest request);

    /** Đồng bộ một nguồn nghiệp vụ vào Qdrant sau khi MySQL commit. */
    @PostExchange("/rag/ingest")
    AiIngestResponse ingest(@RequestBody AiIngestRequest request);

    /** Xóa vector của nguồn nghiệp vụ khi bản ghi gốc bị xóa. */
    @DeleteExchange("/rag/sources/{sourceId}")
    void deleteSource(@PathVariable String sourceId);

    /** Tạo hoặc cập nhật vector cho một category/course công khai. */
    @PostExchange("/catalog/index")
    void indexCatalog(@RequestBody AiCatalogIndexRequest request);

    /** Backfill một batch catalog bằng local embedding, không tiêu tốn quota Gemini. */
    @PostExchange("/catalog/index-batch")
    void indexCatalogBatch(@RequestBody AiCatalogIndexBatchRequest request);

    /** Tìm category/course gần nghĩa bằng cosine similarity. */
    @PostExchange("/catalog/search")
    List<AiCatalogSearchResponse> searchCatalog(@RequestBody AiCatalogSearchRequest request);

    /** Xóa vector catalog khi entity bị xóa hoặc không còn công khai. */
    @DeleteExchange("/catalog/{entityType}/{sourceId}")
    void deleteCatalog(@PathVariable String entityType, @PathVariable String sourceId);
}
