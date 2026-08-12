package com.ailms.client;

import com.ailms.request.ai.AiServiceChatRequest;
import com.ailms.request.ai.AiAssessmentGenerationRequest;
import com.ailms.request.ai.AiConversationTitleRequest;
import com.ailms.request.ai.AiIngestRequest;
import com.ailms.request.ai.InsightsRequest;
import com.ailms.response.ai.InsightsResponse;
import com.ailms.response.ai.AiConversationTitleResponse;
import com.ailms.response.ai.AiAssessmentDraftResponse;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;
import org.springframework.web.service.annotation.DeleteExchange;
import org.springframework.web.bind.annotation.PathVariable;
import reactor.core.publisher.Flux;

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

    /** Sinh quiz/assignment draft đã validate schema từ lesson context và source file tạm thời. */
    @PostExchange("/assessments/generate")
    AiAssessmentDraftResponse generateAssessment(@RequestBody AiAssessmentGenerationRequest request);

    /** Tạo tiêu đề một dòng cho hội thoại mới. */
    @PostExchange("/chat/title")
    AiConversationTitleResponse generateConversationTitle(
            @RequestBody AiConversationTitleRequest request);

    /** Đồng bộ một nguồn nghiệp vụ vào Qdrant sau khi MySQL commit. */
    @PostExchange("/rag/ingest")
    void ingest(@RequestBody AiIngestRequest request);

    /** Xóa vector của nguồn nghiệp vụ khi bản ghi gốc bị xóa. */
    @DeleteExchange("/rag/sources/{sourceId}")
    void deleteSource(@PathVariable String sourceId);
}
