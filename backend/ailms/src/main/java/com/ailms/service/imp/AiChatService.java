package com.ailms.service.imp;

import com.ailms.client.AiServiceClient;
import com.ailms.request.ai.AiChatRequest;
import com.ailms.request.ai.AiConversationTitleRequest;
import com.ailms.request.ai.AiHistoryMessageRequest;
import com.ailms.request.ai.AiServiceChatRequest;
import com.ailms.response.ai.AiConversationResponse;
import com.ailms.response.ai.AiConversationSummaryResponse;
import com.ailms.entity.enums.AiConversationScope;
import com.ailms.entity.enums.AiFeedbackType;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IAiChatService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import reactor.core.publisher.Flux;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

/** Điều phối persistence và stream Admin Copilot qua ai-service. */
@Service
public class AiChatService implements IAiChatService {

    private final AiServiceClient streamingClient;
    private final AiServiceClient standardClient;
    private final AiConversationPersistenceService persistenceService;
    private final AiConversationBufferService bufferService;
    private final AiToolAccessTokenService toolAccessTokenService;

    /** Khởi tạo client streaming và service lưu lịch sử. */
    public AiChatService(
            @Qualifier("aiServiceStreamingClient") AiServiceClient streamingClient,
            AiServiceClient standardClient,
            AiConversationPersistenceService persistenceService,
            AiConversationBufferService bufferService,
            AiToolAccessTokenService toolAccessTokenService) {
        this.streamingClient = streamingClient;
        this.standardClient = standardClient;
        this.persistenceService = persistenceService;
        this.bufferService = bufferService;
        this.toolAccessTokenService = toolAccessTokenService;
    }

    /** Lưu câu hỏi, gửi context đáng tin cậy và lưu câu trả lời khi stream xong. */
    @Override
    public Flux<String> chatStream(AiChatRequest request, CustomUserDetails currentUser) {
        return chatStreamInternal(request, currentUser, null, null);
    }

    /** Validate ảnh nhỏ, định dạng allow-list rồi stream phân tích mà không lưu ảnh vào hội thoại. */
    @Override
    public Flux<String> chatImageStream(
            AiChatRequest request, MultipartFile image, CustomUserDetails currentUser) {
        validateChatImage(image);
        try {
            return chatStreamInternal(request, currentUser,
                    Base64.getEncoder().encodeToString(image.getBytes()), image.getContentType());
        } catch (IOException exception) {
            throw new com.ailms.exception.BadRequestException("Không thể đọc ảnh để phân tích");
        }
    }

    /** Lưu text hội thoại và chuyển ảnh đã kiểm tra vào request nội bộ chỉ trong vòng đời request. */
    private Flux<String> chatStreamInternal(
            AiChatRequest request, CustomUserDetails currentUser,
            String imageBase64, String imageMimeType) {
        Long ownerId = currentUser.getUser().getId();
        AiConversationScope scope = resolveScope(currentUser);
        List<AiHistoryMessageRequest> history = bufferService
                .get(ownerId, request.getConversationId());
        if (history.isEmpty()) {
            history = persistenceService.recentHistory(
                    ownerId, scope, request.getConversationId());
            if (!history.isEmpty()) {
                bufferService.replace(ownerId, request.getConversationId(), history);
            }
        }
        String generatedTitle = history.isEmpty() ? generateTitle(request.getQuestion()) : null;
        persistenceService.appendUserMessage(
                ownerId, scope, request, generatedTitle);
        bufferService.append(ownerId, request.getConversationId(),
                AiHistoryMessageRequest.builder()
                        .role("user")
                        .content(request.getQuestion())
                        .build());
        AiServiceChatRequest internalRequest = AiServiceChatRequest.builder()
                .question(request.getQuestion())
                .conversationId(request.getConversationId())
                .ownerId(String.valueOf(ownerId))
                .roles(trustedRoles(currentUser))
                .scope(scope.name())
                .module(request.getModule())
                .route(request.getRoute())
                .history(history)
                .toolAccessToken(toolAccessTokenService.issue(currentUser))
                .imageBase64(imageBase64)
                .imageMimeType(imageMimeType)
                .build();
        StringBuilder answer = new StringBuilder();
        return streamingClient.chatStream(internalRequest)
                .filter(chunk -> !"[DONE]".equals(chunk))
                .doOnNext(answer::append)
                .doOnComplete(() -> {
                    persistenceService.appendAssistantMessage(
                            ownerId, scope, request.getConversationId(), answer.toString());
                    bufferService.append(ownerId, request.getConversationId(),
                            AiHistoryMessageRequest.builder()
                                    .role("assistant")
                                    .content(answer.toString())
                                    .build());
                });
    }

    /** Chỉ chấp nhận ảnh raster Gemini Vision hỗ trợ và giới hạn 5 MB để tránh gửi payload quá lớn. */
    private void validateChatImage(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new com.ailms.exception.BadRequestException("Cần gửi ảnh để AI phân tích");
        }
        if (image.getSize() > 5 * 1024 * 1024) {
            throw new com.ailms.exception.BadRequestException("Ảnh phân tích tối đa 5 MB");
        }
        String mimeType = image.getContentType();
        if (mimeType == null || !List.of("image/png", "image/jpeg", "image/webp")
                .contains(mimeType.toLowerCase(Locale.ROOT))) {
            throw new com.ailms.exception.BadRequestException("Chỉ hỗ trợ ảnh PNG, JPEG hoặc WEBP");
        }
    }

    /** Liệt kê hội thoại của user đăng nhập. */
    @Override
    public Page<AiConversationSummaryResponse> listConversations(
            Pageable pageable, CustomUserDetails currentUser) {
        return persistenceService.list(
                currentUser.getUser().getId(), resolveScope(currentUser), pageable);
    }

    /** Lấy chi tiết hội thoại sau khi kiểm tra ownership. */
    @Override
    public AiConversationResponse getConversation(
            String conversationId, CustomUserDetails currentUser) {
        return persistenceService.detail(
                currentUser.getUser().getId(), resolveScope(currentUser), conversationId);
    }

    /** Xóa session hội thoại sau khi kiểm tra ownership. */
    @Override
    public void deleteConversation(String conversationId, CustomUserDetails currentUser) {
        Long ownerId = currentUser.getUser().getId();
        persistenceService.delete(ownerId, resolveScope(currentUser), conversationId);
        bufferService.clear(ownerId, conversationId);
    }

    /** Đổi tiêu đề hội thoại của user đăng nhập. */
    @Override
    public AiConversationResponse renameConversation(
            String conversationId, String newTitle, CustomUserDetails currentUser) {
        return persistenceService.rename(
                currentUser.getUser().getId(),
                resolveScope(currentUser),
                conversationId,
                newTitle);
    }

    /** Ghi feedback cho message sau khi kiểm tra ownership. */
    @Override
    public void submitFeedback(
            String messageId, AiFeedbackType feedback, CustomUserDetails currentUser) {
        persistenceService.submitFeedback(
                currentUser.getUser().getId(),
                resolveScope(currentUser),
                messageId,
                feedback);
    }

    /** Gọi Gemini tạo title và fallback null khi AI tạm thời không khả dụng. */
    private String generateTitle(String question) {
        try {
            return standardClient.generateConversationTitle(
                    AiConversationTitleRequest.builder().question(question).build()).getTitle();
        } catch (Exception exception) {
            return null;
        }
    }

    /** Chỉ lấy role đáng tin cậy từ Authentication do backend đã xác thực. */
    private List<String> trustedRoles(CustomUserDetails currentUser) {
        return currentUser.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(authority -> authority.startsWith("ROLE_"))
                .map(String::toUpperCase)
                .toList();
    }

    /** Suy ngữ cảnh chat từ authority thật, không nhận scope từ client. */
    private AiConversationScope resolveScope(CustomUserDetails currentUser) {
        List<String> roles = trustedRoles(currentUser);
        if (roles.contains("ROLE_ADMIN") || roles.contains("ROLE_HR")) {
            return AiConversationScope.ADMIN_COPILOT;
        }
        if (roles.stream().anyMatch(role -> role.equals("ROLE_TEACHER")
                || role.equals("ROLE_INSTRUCTOR") || role.equals("ROLE_TA"))) {
            return AiConversationScope.EMPLOYEE_COPILOT;
        }
        return AiConversationScope.STUDENT_ASSISTANT;
    }
}
