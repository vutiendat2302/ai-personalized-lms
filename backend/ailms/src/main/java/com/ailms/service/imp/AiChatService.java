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
    private final StudentLearningAiContextService studentLearningAiContextService;

    /** Khởi tạo client streaming và service lưu lịch sử. */
    public AiChatService(
            @Qualifier("aiServiceStreamingClient") AiServiceClient streamingClient,
            AiServiceClient standardClient,
            AiConversationPersistenceService persistenceService,
            AiConversationBufferService bufferService,
            AiToolAccessTokenService toolAccessTokenService,
            StudentLearningAiContextService studentLearningAiContextService) {
        this.streamingClient = streamingClient;
        this.standardClient = standardClient;
        this.persistenceService = persistenceService;
        this.bufferService = bufferService;
        this.toolAccessTokenService = toolAccessTokenService;
        this.studentLearningAiContextService = studentLearningAiContextService;
    }

    /** Lưu câu hỏi, gửi context đáng tin cậy và lưu câu trả lời khi stream xong. */
    @Override
    public Flux<String> chatStream(AiChatRequest request, CustomUserDetails currentUser) {
        return chatStreamInternal(request, currentUser, null, null, null);
    }

    /** Stream phân tích ảnh trong chat sau khi Backend đã kiểm soát file upload. */
    @Override
    public Flux<String> chatImageStream(
            AiChatRequest request, MultipartFile image, CustomUserDetails currentUser) {
        return chatFileStream(request, image, currentUser);
    }

    /** Validate tệp tài liệu hoặc ảnh đính kèm, định dạng allow-list rồi stream phân tích. */
    @Override
    public Flux<String> chatFileStream(
            AiChatRequest request, MultipartFile file, CustomUserDetails currentUser) {
        validateChatFile(file);
        try {
            String fileBase64 = Base64.getEncoder().encodeToString(file.getBytes());
            String mimeType = file.getContentType();
            String originalFilename = file.getOriginalFilename();
            return chatStreamInternal(request, currentUser, fileBase64, mimeType, originalFilename);
        } catch (IOException exception) {
            throw new com.ailms.exception.BadRequestException("Không thể đọc tệp để AI phân tích");
        }
    }

    /** Lưu text hội thoại và chuyển tệp/ảnh đã kiểm tra vào request nội bộ chỉ trong vòng đời request. */
    private Flux<String> chatStreamInternal(
            AiChatRequest request, CustomUserDetails currentUser,
            String fileBase64, String fileMimeType, String fileName) {
        Long ownerId = currentUser.getUser().getId();
        AiConversationScope scope = resolveScope(currentUser);
        if (scope == AiConversationScope.STUDENT_ASSISTANT) {
            var context = studentLearningAiContextService.resolve(ownerId, request);
            request.setCourseId(context.courseId());
            request.setClassId(context.classId());
            request.setLessonId(context.lessonId());
            request.setRetrievalScope(context.retrievalScope());
            persistenceService.validateLearningContext(ownerId, scope, request);
        } else {
            // Teacher Copilot cần giữ courseId do route cung cấp để tool truy vấn dữ liệu thật.
            // Quyền trên course vẫn được kiểm tra lại trong ManagementAiContextService.
            request.setClassId(null);
            request.setLessonId(null);
            request.setRetrievalScope("GENERAL");
        }
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
        String toolAccessToken = toolAccessTokenService.issue(currentUser);
        AiServiceChatRequest internalRequest = AiServiceChatRequest.builder()
                .question(request.getQuestion())
                .conversationId(request.getConversationId())
                .ownerId(String.valueOf(ownerId))
                .roles(trustedRoles(currentUser))
                .scope(scope.name())
                .module(request.getModule())
                .route(request.getRoute())
                .history(history)
                .toolAccessToken(toolAccessToken)
                .imageBase64(fileBase64)
                .imageMimeType(fileMimeType)
                .fileBase64(fileBase64)
                .fileMimeType(fileMimeType)
                .fileName(fileName)
                .retrievalMode(request.getRetrievalMode() == null
                        ? "AUTO" : request.getRetrievalMode())
                .courseId(request.getCourseId() == null ? null : String.valueOf(request.getCourseId()))
                .classId(request.getClassId() == null ? null : String.valueOf(request.getClassId()))
                .lessonId(request.getLessonId() == null ? null : String.valueOf(request.getLessonId()))
                .retrievalScope(request.getRetrievalScope())
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

    /** Chấp nhận ảnh và tệp tài liệu PDF, DOCX, TXT với giới hạn tối đa 10 MB. */
    private void validateChatFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new com.ailms.exception.BadRequestException("Cần gửi tệp để AI phân tích");
        }
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new com.ailms.exception.BadRequestException("Kích thước tệp tối đa 10 MB");
        }
        String mimeType = file.getContentType();
        List<String> allowedMimes = List.of(
                "image/png", "image/jpeg", "image/webp",
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "text/plain");
        if (mimeType == null || !allowedMimes.contains(mimeType.toLowerCase(Locale.ROOT))) {
            throw new com.ailms.exception.BadRequestException(
                    "Định dạng tệp không được hỗ trợ. Chỉ chấp nhận ảnh (PNG, JPEG, WEBP) hoặc tài liệu (PDF, DOCX, TXT)");
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
