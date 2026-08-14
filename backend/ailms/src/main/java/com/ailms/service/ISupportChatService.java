package com.ailms.service;

import com.ailms.request.support.ContactRequest;
import com.ailms.request.support.GuidedRecommendationRequest;
import com.ailms.request.support.PresenceRequest;
import com.ailms.request.support.QuickReplyRequest;
import com.ailms.request.support.SupportMessageRequest;
import com.ailms.request.support.SupportResourceRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.publicapi.PublicCourseCardResponse;
import com.ailms.response.support.SupportConversationResponse;
import com.ailms.response.support.SupportMessageResponse;
import com.ailms.response.support.SupportOptionResponse;
import com.ailms.response.support.SupportQueueResponse;
import com.ailms.response.support.SupportResourceResponse;
import com.ailms.response.support.VisitorSessionResponse;
import com.ailms.security.CustomUserDetails;

import java.security.Principal;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

/** Hợp đồng nghiệp vụ cho guided support và cuộc trò chuyện với tư vấn viên. */
public interface ISupportChatService {
    /** Lấy khóa học thật theo ngữ cảnh guided. */
    PageResponse<PublicCourseCardResponse> recommendCourses(GuidedRecommendationRequest request);
    /** Tạo phiên visitor và cấp token truy cập. */
    VisitorSessionResponse createVisitor();
    /** Lấy các lựa chọn guided được kiểm soát. */
    List<SupportOptionResponse> getOptions();
    /** Lấy hoặc tạo conversation đang mở. */
    SupportConversationResponse currentConversation(String token);
    /** Tạo hoặc khôi phục conversation của visitor. */
    SupportConversationResponse createConversation(String token);
    /** Kết thúc phiên mở hiện tại và tạo một conversation guided mới. */
    SupportConversationResponse startNewConversation(String token);
    /** Xử lý lựa chọn guided. */
    SupportMessageResponse handleQuickReply(Long conversationId, String token, QuickReplyRequest request);
    /** Gợi ý quick intent từ mô tả tự do bằng vector embedding. */
    SupportMessageResponse suggestQuickReplies(Long conversationId, String token, SupportMessageRequest request);
    /** Lưu contact và đưa yêu cầu vào queue. */
    SupportConversationResponse saveContact(Long conversationId, String token, ContactRequest request);
    /** Gửi message HTTP của visitor. */
    SupportMessageResponse sendVisitorMessage(Long conversationId, String token, SupportMessageRequest request);
    /** Upload file/ảnh của visitor vào conversation ACTIVE. */
    SupportMessageResponse uploadVisitorAttachment(Long conversationId, String token, MultipartFile file);
    /** Lấy message của visitor. */
    PageResponse<SupportMessageResponse> getMessages(Long conversationId, String token, int page, int size);
    /** Hủy yêu cầu visitor chưa được tiếp nhận. */
    SupportConversationResponse cancel(Long conversationId, String token);
    /** Đóng conversation phía visitor. */
    SupportConversationResponse close(Long conversationId, String token);
    /** Lấy lịch sử conversation. */
    PageResponse<SupportConversationResponse> history(String token, int page, int size);
    /** Lấy conversation sau khi kiểm tra ownership. */
    SupportConversationResponse getConversation(Long conversationId, String token);
    /** Đổi token visitor thành ID nội bộ. */
    String resolveVisitorId(String token);
    /** Kiểm tra quyền truy cập realtime. */
    boolean canAccessRealtime(Long conversationId, Principal principal);
    /** Gửi message realtime của visitor. */
    SupportMessageResponse sendVisitorMessageByVisitorId(Long conversationId, String visitorId, SupportMessageRequest request);
    /** Cập nhật presence của tư vấn viên. */
    void updatePresence(CustomUserDetails currentUser, PresenceRequest request);
    /** Lấy queue FIFO. */
    SupportQueueResponse getQueue();
    /** Lấy conversation của tư vấn viên hiện tại. */
    SupportQueueResponse getHrConversations(CustomUserDetails currentUser);
    /** Lấy chi tiết conversation của tư vấn viên. */
    SupportConversationResponse getHrConversation(Long conversationId, CustomUserDetails currentUser);
    /** Lấy message của tư vấn viên. */
    PageResponse<SupportMessageResponse> getHrMessages(Long conversationId, CustomUserDetails currentUser, int page, int size);
    /** Chủ động claim một ticket trong hàng đợi chung. */
    SupportConversationResponse accept(Long conversationId, CustomUserDetails currentUser);
    /** Gửi message của tư vấn viên. */
    SupportMessageResponse sendHrMessage(Long conversationId, CustomUserDetails currentUser, SupportMessageRequest request);
    /** Upload file/ảnh của tư vấn viên vào conversation ACTIVE. */
    SupportMessageResponse uploadHrAttachment(Long conversationId, CustomUserDetails currentUser, MultipartFile file);
    /** Tìm tài nguyên catalog thật để tư vấn viên gửi dạng card. */
    List<SupportResourceResponse> searchResources(String query, int limit);
    /** Gửi một card catalog đã kiểm tra tồn tại và trạng thái public. */
    SupportMessageResponse sendHrResource(Long conversationId, CustomUserDetails currentUser, SupportResourceRequest request);
    /** Yêu cầu visitor xác nhận đóng. */
    SupportConversationResponse requestClose(Long conversationId, CustomUserDetails currentUser);
    /** Đóng conversation phía tư vấn viên. */
    SupportConversationResponse closeByHr(Long conversationId, CustomUserDetails currentUser);
    /** Tự đóng phiên khi visitor không phản hồi supporter quá 20 phút. */
    void closeVisitorResponseTimeouts();
}
