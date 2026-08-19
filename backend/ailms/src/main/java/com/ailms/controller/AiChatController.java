package com.ailms.controller;

import com.ailms.common.snowflake.SnowflakeIdGenerator;
import com.ailms.request.ai.AiChatRequest;
import com.ailms.request.ai.AiFeedbackRequest;
import com.ailms.request.ai.RenameAiConversationRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.ai.AiConversationResponse;
import com.ailms.response.ai.AiConversationSummaryResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IAiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;

/** API chat dùng chung, lịch sử được tách theo owner và scope phía server. */
@RestController
@RequestMapping("${api.prefix}/ai")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class AiChatController {

    private final IAiChatService aiChatService;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    /** Stream câu trả lời AI và lưu hội thoại theo scope user hiện tại. */
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<Flux<String>> chatStream(
            @Valid @RequestBody AiChatRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        if (request.getConversationId() == null || request.getConversationId().isBlank()) {
            request.setConversationId(String.valueOf(snowflakeIdGenerator.nextId()));
        }
        return ResponseEntity.ok()
                .header("X-Conversation-Id", request.getConversationId())
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body(aiChatService.chatStream(request, currentUser));
    }

    /** Stream Gemini Vision phân tích ảnh bảng số liệu hoặc câu hỏi trong ảnh. */
    @PostMapping(value = "/chat/image/stream", consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<Flux<String>> chatImageStream(
            @RequestParam(value = "question", required = false) String question,
            @RequestParam(value = "conversationId", required = false) String conversationId,
            @RequestParam(value = "module", required = false) String module,
            @RequestParam(value = "route", required = false) String route,
            @RequestPart("image") MultipartFile image,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return chatFileStream(question, conversationId, module, route, image, currentUser);
    }

    /** Stream phân tích tệp tài liệu PDF, DOCX, TXT hoặc hình ảnh đính kèm trong chat. */
    @PostMapping(value = "/chat/file/stream", consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<Flux<String>> chatFileStream(
            @RequestParam(value = "question", required = false) String question,
            @RequestParam(value = "conversationId", required = false) String conversationId,
            @RequestParam(value = "module", required = false) String module,
            @RequestParam(value = "route", required = false) String route,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        AiChatRequest request = AiChatRequest.builder()
                .question(question == null || question.isBlank()
                        ? "Hãy phân tích nội dung tệp đính kèm và giải thích các điểm quan trọng."
                        : question)
                .conversationId(conversationId)
                .module(module)
                .route(route)
                .build();
        if (request.getConversationId() == null || request.getConversationId().isBlank()) {
            request.setConversationId(String.valueOf(snowflakeIdGenerator.nextId()));
        }
        return ResponseEntity.ok()
                .header("X-Conversation-Id", request.getConversationId())
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body(aiChatService.chatFileStream(request, file, currentUser));
    }

    /** Phân trang hội thoại theo scope backend suy từ authority hiện tại. */
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<PageResponse<AiConversationSummaryResponse>>> listConversations(
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of(
                "Lấy lịch sử hội thoại thành công",
                PageResponse.from(aiChatService.listConversations(pageable, currentUser))));
    }

    /** Mở lại hội thoại thuộc đúng owner và scope hiện tại. */
    @GetMapping("/conversations/{conversationId}")
    public ResponseEntity<ApiResponse<AiConversationResponse>> getConversation(
            @PathVariable String conversationId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of(
                "Lấy chi tiết hội thoại thành công",
                aiChatService.getConversation(conversationId, currentUser)));
    }

    /** Xóa vĩnh viễn session thuộc đúng owner và scope hiện tại. */
    @DeleteMapping("/conversations/{conversationId}")
    public ResponseEntity<ApiResponse<Void>> deleteConversation(
            @PathVariable String conversationId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        aiChatService.deleteConversation(conversationId, currentUser);
        return ResponseEntity.ok(ApiResponse.message("Đã xóa hội thoại"));
    }

    /** Đổi tiêu đề một hội thoại thuộc admin hiện tại. */
    @PatchMapping("/conversations/{conversationId}/title")
    public ResponseEntity<ApiResponse<AiConversationResponse>> renameConversation(
            @PathVariable String conversationId,
            @Valid @RequestBody RenameAiConversationRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of(
                "Đổi tiêu đề hội thoại thành công",
                aiChatService.renameConversation(conversationId, request.getTitle(), currentUser)));
    }

    /** Ghi thumbs up/down cho một câu trả lời AI. */
    @PutMapping("/messages/{messageId}/feedback")
    public ResponseEntity<ApiResponse<Void>> submitFeedback(
            @PathVariable String messageId,
            @Valid @RequestBody AiFeedbackRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        aiChatService.submitFeedback(messageId, request.getFeedback(), currentUser);
        return ResponseEntity.ok(ApiResponse.message("Đã ghi nhận đánh giá"));
    }
}
