package com.ailms.service;

import com.ailms.request.ai.AiChatRequest;
import com.ailms.entity.enums.AiFeedbackType;
import com.ailms.response.ai.AiConversationResponse;
import com.ailms.response.ai.AiConversationSummaryResponse;
import com.ailms.security.CustomUserDetails;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;

/**
 * Interface dịch vụ xử lý AI Chat streaming.
 */
public interface IAiChatService {

    /**
     * Stream câu trả lời của AI dưới dạng Flux SSE.
     */
    Flux<String> chatStream(AiChatRequest request, CustomUserDetails currentUser);

    /** Stream phân tích ảnh trong chat sau khi Backend đã kiểm soát file upload. */
    Flux<String> chatImageStream(AiChatRequest request, MultipartFile image, CustomUserDetails currentUser);

    /** Liệt kê lịch sử hội thoại thuộc user hiện tại. */
    Page<AiConversationSummaryResponse> listConversations(
            Pageable pageable, CustomUserDetails currentUser);

    /** Mở lại một hội thoại cùng toàn bộ tin nhắn. */
    AiConversationResponse getConversation(String conversationId, CustomUserDetails currentUser);

    /** Xóa một session hội thoại thuộc user hiện tại. */
    void deleteConversation(String conversationId, CustomUserDetails currentUser);

    /** Đổi tiêu đề hội thoại sau khi kiểm tra ownership. */
    AiConversationResponse renameConversation(
            String conversationId, String newTitle, CustomUserDetails currentUser);

    /** Lưu thumbs up/down để đo chất lượng câu trả lời Copilot. */
    void submitFeedback(
            String messageId, AiFeedbackType feedback, CustomUserDetails currentUser);
}
