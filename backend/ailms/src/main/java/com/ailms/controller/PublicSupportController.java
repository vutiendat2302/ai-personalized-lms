package com.ailms.controller;

import com.ailms.request.support.ContactRequest;
import com.ailms.request.support.GuidedRecommendationRequest;
import com.ailms.request.support.QuickReplyRequest;
import com.ailms.request.support.SupportMessageRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.support.SupportConversationResponse;
import com.ailms.response.support.SupportMessageResponse;
import com.ailms.response.support.SupportOptionResponse;
import com.ailms.response.support.VisitorSessionResponse;
import com.ailms.response.publicapi.PublicCourseCardResponse;
import com.ailms.service.ISupportChatService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** API guided chat public, xác thực visitor bằng token hash thay vì conversation ID. */
@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("${api.prefix}/public/support")
public class PublicSupportController {
    private final ISupportChatService supportChatService;

    /** Khởi tạo visitor session và trả token dùng cho các request support tiếp theo. */
    @PostMapping("/visitors")
    public ResponseEntity<ApiResponse<VisitorSessionResponse>> createVisitor() {
        return ResponseEntity.ok(ApiResponse.of("Visitor session created", supportChatService.createVisitor()));
    }

    /** Lấy danh sách quick reply/template được backend kiểm soát. */
    @GetMapping("/options")
    public ResponseEntity<ApiResponse<List<SupportOptionResponse>>> getOptions() {
        return ResponseEntity.ok(ApiResponse.of("Support options retrieved", supportChatService.getOptions()));
    }

    /** Gọi Backend -> AI catalog để chọn khóa học thật theo lựa chọn guided, không lưu conversation. */
    @PostMapping("/recommendations")
    public ResponseEntity<ApiResponse<PageResponse<PublicCourseCardResponse>>> recommendations(
            @Valid @RequestBody GuidedRecommendationRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Guided course recommendations retrieved",
                supportChatService.recommendCourses(request)));
    }

    /** Lấy hoặc tạo conversation guided hiện tại, dùng khi widget mở/reload. */
    @GetMapping("/conversations/current")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> current(
            @RequestHeader(name = "X-Visitor-Token", required = false) String token) {
        return ResponseEntity.ok(ApiResponse.of("Current support conversation retrieved",
                supportChatService.currentConversation(token)));
    }

    /** Tạo conversation mới hoặc trả conversation mở hiện tại để chống duplicate ticket. */
    @PostMapping("/conversations")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> create(
            @RequestHeader(name = "X-Visitor-Token", required = false) String token) {
        return ResponseEntity.ok(ApiResponse.of("Support conversation created",
                supportChatService.createConversation(token)));
    }

    /** Chủ động kết thúc phiên mở hiện tại và tạo conversation guided mới. */
    @PostMapping("/conversations/new")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> createNew(
            @RequestHeader(name = "X-Visitor-Token", required = false) String token) {
        return ResponseEntity.ok(ApiResponse.of("New support conversation created",
                supportChatService.startNewConversation(token)));
    }

    /** Lấy lịch sử conversation cũ của visitor đã xác thực. */
    @GetMapping("/conversations/history")
    public ResponseEntity<ApiResponse<PageResponse<SupportConversationResponse>>> history(
            @RequestHeader(name = "X-Visitor-Token", required = false) String token,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(ApiResponse.of("Support conversation history retrieved",
                supportChatService.history(token, page, size)));
    }

    /** Lấy chi tiết một conversation chỉ khi thuộc visitor đang gửi token. */
    @GetMapping("/conversations/{conversationId}")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> conversation(
            @PathVariable Long conversationId,
            @RequestHeader(name = "X-Visitor-Token", required = false) String token) {
        return ResponseEntity.ok(ApiResponse.of("Support conversation retrieved",
                supportChatService.getConversation(conversationId, token)));
    }

    /** Xử lý quick reply bằng optionId, tuyệt đối không chuyển label tùy ý sang Gemini. */
    @PostMapping("/conversations/{conversationId}/quick-replies")
    public ResponseEntity<ApiResponse<SupportMessageResponse>> quickReply(
            @PathVariable Long conversationId,
            @RequestHeader(name = "X-Visitor-Token", required = false) String token,
            @Valid @RequestBody QuickReplyRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Quick reply processed",
                supportChatService.handleQuickReply(conversationId, token, request)));
    }

    /** Nhận mô tả nhu cầu và trả quick intent gần nghĩa, không cho AI tự trả dữ liệu nghiệp vụ. */
    @PostMapping("/conversations/{conversationId}/guided-messages")
    public ResponseEntity<ApiResponse<SupportMessageResponse>> guidedMessage(
            @PathVariable Long conversationId,
            @RequestHeader(name = "X-Visitor-Token", required = false) String token,
            @Valid @RequestBody SupportMessageRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Guided intent suggestions retrieved",
                supportChatService.suggestQuickReplies(conversationId, token, request)));
    }

    /** Lưu số điện thoại bắt buộc và đưa visitor vào queue/assignment. */
    @PostMapping("/conversations/{conversationId}/contact")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> contact(
            @PathVariable Long conversationId,
            @RequestHeader(name = "X-Visitor-Token", required = false) String token,
            @Valid @RequestBody ContactRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Contact saved and support request queued",
                supportChatService.saveContact(conversationId, token, request)));
    }

    /** Gửi yêu cầu gặp tư vấn viên sau khi visitor đã cung cấp contact. */
    @PostMapping("/conversations/{conversationId}/request-agent")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> requestAgent(
            @PathVariable Long conversationId,
            @RequestHeader(name = "X-Visitor-Token", required = false) String token,
            @Valid @RequestBody ContactRequest request) {
        return contact(conversationId, token, request);
    }

    /** Lấy tin nhắn của conversation thuộc visitor hiện tại. */
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ApiResponse<PageResponse<SupportMessageResponse>>> messages(
            @PathVariable Long conversationId,
            @RequestHeader(name = "X-Visitor-Token", required = false) String token,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "100") @Min(1) @Max(100) int size) {
        return ResponseEntity.ok(ApiResponse.of("Support messages retrieved",
                supportChatService.getMessages(conversationId, token, page, size)));
    }

    /** Gửi tin nhắn visitor, backend chỉ nhận khi conversation ACTIVE với HR. */
    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ApiResponse<SupportMessageResponse>> message(
            @PathVariable Long conversationId,
            @RequestHeader(name = "X-Visitor-Token", required = false) String token,
            @Valid @RequestBody SupportMessageRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Support message sent",
                supportChatService.sendVisitorMessage(conversationId, token, request)));
    }

    /** Upload ảnh hoặc tài liệu tối đa 10MB khi visitor đã kết nối tư vấn viên. */
    @PostMapping(value = "/conversations/{conversationId}/attachments", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<SupportMessageResponse>> attachment(
            @PathVariable Long conversationId,
            @RequestHeader(name = "X-Visitor-Token", required = false) String token,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.of("Support attachment uploaded",
                supportChatService.uploadVisitorAttachment(conversationId, token, file)));
    }

    /** Từ chối visitor tự hủy ticket và trả lỗi nghiệp vụ rõ ràng cho client cũ. */
    @PostMapping("/conversations/{conversationId}/cancel")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> cancel(
            @PathVariable Long conversationId,
            @RequestHeader(name = "X-Visitor-Token", required = false) String token) {
        return ResponseEntity.ok(ApiResponse.of("Support request cancelled",
                supportChatService.cancel(conversationId, token)));
    }

    /** Đóng conversation và lưu toàn bộ lịch sử trong database. */
    @PostMapping("/conversations/{conversationId}/close")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> close(
            @PathVariable Long conversationId,
            @RequestHeader(name = "X-Visitor-Token", required = false) String token) {
        return ResponseEntity.ok(ApiResponse.of("Support conversation closed",
                supportChatService.close(conversationId, token)));
    }
}
