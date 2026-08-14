package com.ailms.service.imp;

import com.ailms.entity.AiConversationEntity;
import com.ailms.entity.AiMessageEntity;
import com.ailms.entity.enums.AiConversationScope;
import com.ailms.entity.enums.AiFeedbackType;
import com.ailms.exception.BadRequestException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.AiConversationRepository;
import com.ailms.repository.AiMessageRepository;
import com.ailms.request.ai.AiChatRequest;
import com.ailms.request.ai.AiHistoryMessageRequest;
import com.ailms.response.ai.AiConversationResponse;
import com.ailms.response.ai.AiConversationSummaryResponse;
import com.ailms.response.ai.AiMessageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Lưu và truy vấn lịch sử hội thoại AI có kiểm tra ownership. */
@Service
@RequiredArgsConstructor
public class AiConversationPersistenceService {

    private final AiConversationRepository conversationRepository;
    private final AiMessageRepository messageRepository;

    /** Tạo hội thoại khi cần và lưu câu hỏi mới của user. */
    @Transactional
    public void appendUserMessage(
            Long ownerId,
            AiConversationScope scope,
            AiChatRequest request,
            String generatedTitle) {
        LocalDateTime now = LocalDateTime.now();
        AiConversationEntity conversation = conversationRepository.findById(request.getConversationId())
                .map(existing -> {
                    if (!existing.getOwnerId().equals(ownerId)
                            || existing.getScope() != scope) {
                        throw conversationNotFound();
                    }
                    return existing;
                })
                .orElseGet(() -> AiConversationEntity.builder()
                        .id(request.getConversationId())
                        .ownerId(ownerId)
                        .title(normalizeTitle(generatedTitle, request.getQuestion()))
                        .scope(scope)
                        .module(normalizeModule(request.getModule()))
                        .contextRoute(request.getRoute())
                        .lastMessageAt(now)
                        .build());
        conversation.setModule(normalizeModule(request.getModule()));
        conversation.setContextRoute(request.getRoute());
        conversation.setLastMessageAt(now);
        conversation = conversationRepository.saveAndFlush(conversation);
        messageRepository.save(AiMessageEntity.builder()
                .conversation(conversation)
                .role("user")
                .content(request.getQuestion())
                .build());
    }

    /** Lưu câu trả lời hoàn chỉnh sau khi stream kết thúc. */
    @Transactional
    public void appendAssistantMessage(
            Long ownerId,
            AiConversationScope scope,
            String conversationId,
            String content) {
        if (content == null || content.isBlank()) {
            return;
        }
        AiConversationEntity conversation = requireOwned(conversationId, ownerId, scope);
        conversation.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conversation);
        messageRepository.save(AiMessageEntity.builder()
                .conversation(conversation)
                .role("assistant")
                .content(content)
                .build());
    }

    /** Lấy tối đa mười tin nhắn gần nhất theo đúng thứ tự thời gian. */
    @Transactional(readOnly = true)
    public List<AiHistoryMessageRequest> recentHistory(
            Long ownerId, AiConversationScope scope, String conversationId) {
        var conversation = conversationRepository.findById(conversationId);
        if (conversation.isEmpty()) return List.of();
        if (!conversation.get().getOwnerId().equals(ownerId)
                || conversation.get().getScope() != scope) throw conversationNotFound();
        List<AiMessageEntity> messages = new ArrayList<>(
                messageRepository.findTop10ByConversation_IdOrderByCreatedAtDesc(conversationId));
        Collections.reverse(messages);
        return messages.stream()
                .map(message -> AiHistoryMessageRequest.builder()
                        .role(message.getRole())
                        .content(message.getContent())
                        .build())
                .toList();
    }

    /** Phân trang hội thoại theo owner và scope. */
    @Transactional(readOnly = true)
    public Page<AiConversationSummaryResponse> list(
            Long ownerId, AiConversationScope scope, Pageable pageable) {
        return conversationRepository
                .findByOwnerIdAndScopeOrderByLastMessageAtDesc(ownerId, scope, pageable)
                .map(this::toSummaryResponse);
    }

    /** Lấy chi tiết hội thoại và toàn bộ tin nhắn khi đúng owner. */
    @Transactional(readOnly = true)
    public AiConversationResponse detail(
            Long ownerId, AiConversationScope scope, String conversationId) {
        AiConversationEntity conversation = requireOwned(conversationId, ownerId, scope);
        List<AiMessageResponse> messages = messageRepository
                .findByConversation_IdOrderByCreatedAtAsc(conversationId)
                .stream().map(this::toMessageResponse).toList();
        return toResponse(conversation, messages);
    }

    /** Xóa toàn bộ message và hội thoại khi đúng owner. */
    @Transactional
    public void delete(Long ownerId, AiConversationScope scope, String conversationId) {
        AiConversationEntity conversation = requireOwned(conversationId, ownerId, scope);
        messageRepository.deleteByConversation_Id(conversationId);
        conversationRepository.delete(conversation);
    }

    /** Đổi tiêu đề hội thoại thuộc user hiện tại. */
    @Transactional
    public AiConversationResponse rename(
            Long ownerId,
            AiConversationScope scope,
            String conversationId,
            String newTitle) {
        AiConversationEntity conversation = requireOwned(conversationId, ownerId, scope);
        conversation.setTitle(newTitle.trim());
        return toResponse(conversationRepository.save(conversation), List.of());
    }

    /** Ghi thumbs up/down cho một câu trả lời assistant thuộc user hiện tại. */
    @Transactional
    public void submitFeedback(
            Long ownerId,
            AiConversationScope scope,
            String messageId,
            AiFeedbackType feedback) {
        Long id;
        try {
            id = Long.valueOf(messageId);
        } catch (NumberFormatException exception) {
            throw messageNotFound();
        }
        AiMessageEntity message = messageRepository
                .findByIdAndConversation_OwnerIdAndConversation_Scope(id, ownerId, scope)
                .orElseThrow(this::messageNotFound);
        if (!"assistant".equals(message.getRole())) {
            throw new BadRequestException("Chỉ có thể đánh giá câu trả lời của AI.");
        }
        message.setFeedback(feedback);
        messageRepository.save(message);
    }

    /** Kiểm tra hội thoại tồn tại và thuộc user hiện tại. */
    private AiConversationEntity requireOwned(
            String conversationId, Long ownerId, AiConversationScope scope) {
        return conversationRepository.findByIdAndOwnerIdAndScope(conversationId, ownerId, scope)
                .orElseThrow(this::conversationNotFound);
    }

    /** Chuẩn hóa tiêu đề Gemini và fallback sang câu hỏi đầu tiên. */
    private String normalizeTitle(String generatedTitle, String question) {
        if (generatedTitle != null && !generatedTitle.isBlank()) {
            String normalizedTitle = generatedTitle.trim().replaceAll("\\s+", " ");
            return normalizedTitle.length() <= 160
                    ? normalizedTitle
                    : normalizedTitle.substring(0, 157) + "...";
        }
        String normalized = question.trim().replaceAll("\\s+", " ");
        return normalized.length() <= 80 ? normalized : normalized.substring(0, 77) + "...";
    }

    /** Chuẩn hóa module quản trị để dùng nhất quán khi retrieval. */
    private String normalizeModule(String module) {
        return module == null || module.isBlank() ? "GENERAL" : module.trim().toUpperCase();
    }

    /** Chuyển entity hội thoại thành response DTO. */
    private AiConversationResponse toResponse(
            AiConversationEntity entity, List<AiMessageResponse> messages) {
        return AiConversationResponse.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .scope(entity.getScope())
                .module(entity.getModule())
                .route(entity.getContextRoute())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getLastMessageAt())
                .messages(messages)
                .build();
    }

    /** Chuyển entity tin nhắn thành response DTO với ID dạng string. */
    private AiMessageResponse toMessageResponse(AiMessageEntity entity) {
        return AiMessageResponse.builder()
                .id(String.valueOf(entity.getId()))
                .role(entity.getRole())
                .content(entity.getContent())
                .createdAt(entity.getCreatedAt())
                .feedback(entity.getFeedback())
                .build();
    }

    /** Chuyển entity thành DTO gọn cho danh sách phân trang. */
    private AiConversationSummaryResponse toSummaryResponse(AiConversationEntity entity) {
        return AiConversationSummaryResponse.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .scope(entity.getScope())
                .module(entity.getModule())
                .route(entity.getContextRoute())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getLastMessageAt())
                .build();
    }

    /** Trả cùng một lỗi 404 cho ID không tồn tại hoặc không thuộc owner. */
    private ResourceNotFoundException conversationNotFound() {
        return new ResourceNotFoundException("Không tìm thấy hội thoại.");
    }

    /** Trả lỗi 404 không tiết lộ message của user khác. */
    private ResourceNotFoundException messageNotFound() {
        return new ResourceNotFoundException("Không tìm thấy tin nhắn.");
    }
}
