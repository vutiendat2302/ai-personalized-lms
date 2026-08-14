package com.ailms.controller;

import com.ailms.request.support.PresenceRequest;
import com.ailms.request.support.SupportMessageRequest;
import com.ailms.request.support.SupportResourceRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.support.SupportConversationResponse;
import com.ailms.response.support.SupportMessageResponse;
import com.ailms.response.support.SupportQueueResponse;
import com.ailms.response.support.SupportResourceResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.ISupportChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.List;

/** API SUPPORT quản lý presence, queue và các conversation được phân công. */
@RestController
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasAuthority('ROLE_SUPPORT')")
@RequestMapping("${api.prefix}/support")
public class HrSupportController {
    private final ISupportChatService supportChatService;

    /** Cập nhật presence/heartbeat, chỉ ONLINE_AVAILABLE mới được phân công ticket. */
    @PostMapping("/presence")
    public ResponseEntity<ApiResponse<Void>> presence(@AuthenticationPrincipal CustomUserDetails currentUser,
                                                       @Valid @RequestBody PresenceRequest request) {
        supportChatService.updatePresence(currentUser, request);
        return ResponseEntity.ok(ApiResponse.message("Support presence updated"));
    }

    /** Lấy queue FIFO và vị trí chờ đã tính lại. */
    @GetMapping("/queue")
    public ResponseEntity<ApiResponse<SupportQueueResponse>> queue() {
        return ResponseEntity.ok(ApiResponse.of("Support queue retrieved", supportChatService.getQueue()));
    }

    /** Lấy cuộc trò chuyện hiện tại và lịch sử đã đóng của SUPPORT. */
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<SupportQueueResponse>> conversations(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Assigned support conversations retrieved",
                supportChatService.getHrConversations(currentUser)));
    }

    /** Lấy thông tin một conversation đã được phân công cho SUPPORT hiện tại. */
    @GetMapping("/conversations/{conversationId}")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> conversation(
            @PathVariable Long conversationId, @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Assigned support conversation retrieved",
                supportChatService.getHrConversation(conversationId, currentUser)));
    }

    /** Lấy lịch sử message của conversation được phân công cho SUPPORT hiện tại. */
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ApiResponse<PageResponse<SupportMessageResponse>>> messages(
            @PathVariable Long conversationId, @AuthenticationPrincipal CustomUserDetails currentUser,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "0") int page,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "100") int size) {
        return ResponseEntity.ok(ApiResponse.of("Assigned support messages retrieved",
                supportChatService.getHrMessages(conversationId, currentUser, page, size)));
    }

    /** Chủ động nhận conversation từ hàng đợi chung. */
    @PostMapping("/conversations/{conversationId}/accept")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> accept(
            @PathVariable Long conversationId, @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Support conversation accepted",
                supportChatService.accept(conversationId, currentUser)));
    }

    /** SUPPORT gửi tin nhắn tự do trong phiên ACTIVE. */
    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ApiResponse<SupportMessageResponse>> message(
            @PathVariable Long conversationId, @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody SupportMessageRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Support message sent",
                supportChatService.sendHrMessage(conversationId, currentUser, request)));
    }

    /** Upload ảnh hoặc tài liệu tối đa 10MB vào conversation đang ACTIVE. */
    @PostMapping(value = "/conversations/{conversationId}/attachments", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<SupportMessageResponse>> attachment(
            @PathVariable Long conversationId, @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.of("Support attachment uploaded",
                supportChatService.uploadHrAttachment(conversationId, currentUser, file)));
    }

    /** Tìm course, category và package đang public để gửi cho visitor. */
    @GetMapping("/resources")
    public ResponseEntity<ApiResponse<List<SupportResourceResponse>>> resources(
            @RequestParam(required = false, defaultValue = "") @Size(max = 100) String query,
            @RequestParam(required = false, defaultValue = "12") @Min(1) @Max(30) int limit) {
        return ResponseEntity.ok(ApiResponse.of("Support resources retrieved",
                supportChatService.searchResources(query, limit)));
    }

    /** Gửi card tài nguyên catalog thật vào conversation. */
    @PostMapping("/conversations/{conversationId}/resources")
    public ResponseEntity<ApiResponse<SupportMessageResponse>> resource(
            @PathVariable Long conversationId, @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody SupportResourceRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Support resource sent",
                supportChatService.sendHrResource(conversationId, currentUser, request)));
    }

    /** SUPPORT chuyển ACTIVE sang WAITING_CONFIRMATION và yêu cầu visitor xác nhận đóng. */
    @PostMapping("/conversations/{conversationId}/request-close")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> requestClose(
            @PathVariable Long conversationId, @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Support close confirmation requested",
                supportChatService.requestClose(conversationId, currentUser)));
    }

    /** Từ chối đóng trực tiếp; endpoint giữ lại để trả lỗi nghiệp vụ rõ ràng cho client cũ. */
    @PostMapping("/conversations/{conversationId}/close")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> close(
            @PathVariable Long conversationId, @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Support conversation closed",
                supportChatService.closeByHr(conversationId, currentUser)));
    }
}
