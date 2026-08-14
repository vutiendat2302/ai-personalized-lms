package com.ailms.service.imp;

import com.ailms.entity.AnonymousVisitorEntity;
import com.ailms.entity.SupportChatMessageEntity;
import com.ailms.entity.SupportConversationEntity;
import com.ailms.entity.SupportHrPresenceEntity;
import com.ailms.entity.FileMetadataEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.SupportConversationStatusEnum;
import com.ailms.entity.enums.SupportHrPresenceStatusEnum;
import com.ailms.entity.enums.SupportMessageSenderEnum;
import com.ailms.entity.enums.SupportMessageTypeEnum;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import com.ailms.entity.enums.CourseLevelEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.entity.enums.FileUsageTypeEnum;
import com.ailms.event.SupportMessageCreatedEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.AnonymousVisitorRepository;
import com.ailms.repository.CategoryRepository;
import com.ailms.repository.SupportChatMessageRepository;
import com.ailms.repository.SupportConversationRepository;
import com.ailms.repository.SupportHrPresenceRepository;
import com.ailms.repository.FileMetadataRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CoursePackageRepository;
import com.ailms.request.support.ContactRequest;
import com.ailms.request.support.GuidedRecommendationRequest;
import com.ailms.request.support.PresenceRequest;
import com.ailms.request.support.QuickReplyRequest;
import com.ailms.request.support.SupportMessageRequest;
import com.ailms.request.support.SupportResourceRequest;
import com.ailms.request.CourseSearchRequest;
import com.ailms.response.CourseResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.publicapi.PublicCourseCardResponse;
import com.ailms.response.support.SupportConversationResponse;
import com.ailms.response.support.SupportMessageResponse;
import com.ailms.response.support.SupportOptionResponse;
import com.ailms.response.support.SupportQueueResponse;
import com.ailms.response.support.VisitorSessionResponse;
import com.ailms.response.support.SupportResourceResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.search.MeilisearchCourseService;
import com.ailms.service.IPublicCatalogService;
import com.ailms.service.IFileStorageService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.Duration;
import java.time.ZoneId;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.security.Principal;

/** Nghiệp vụ guided support, queue FIFO và phân công HR không sử dụng Gemini. */
@Service
@RequiredArgsConstructor
public class SupportChatService implements com.ailms.service.ISupportChatService {
    private static final String VISITOR_HEADER = "X-Visitor-Token";
    private static final int HEARTBEAT_SECONDS = 90;
    private static final int DEFAULT_AVERAGE_MINUTES = 5;
    private static final int REQUEST_CLOSE_WAIT_MINUTES = 5;
    private static final int AUTO_CLOSE_WAIT_MINUTES = 20;
    private static final Collection<SupportConversationStatusEnum> OPEN_STATUSES = EnumSet.of(
            SupportConversationStatusEnum.GUIDED, SupportConversationStatusEnum.COLLECTING_CONTACT,
            SupportConversationStatusEnum.QUEUED, SupportConversationStatusEnum.ASSIGNED,
            SupportConversationStatusEnum.ACTIVE, SupportConversationStatusEnum.WAITING_CONFIRMATION);

    private final AnonymousVisitorRepository visitorRepository;
    private final SupportConversationRepository conversationRepository;
    private final SupportChatMessageRepository messageRepository;
    private final SupportHrPresenceRepository presenceRepository;
    private final FileMetadataRepository fileMetadataRepository;
    private final CategoryRepository categoryRepository;
    private final IPublicCatalogService catalogService;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final CourseRepository courseRepository;
    private final CoursePackageRepository coursePackageRepository;
    private final MeilisearchCourseService meilisearchCourseService;
    private final IFileStorageService fileStorageService;
    private final PublicAiChatService publicAiChatService;

    /** Gọi semantic catalog thật qua Backend để guided chat không tự bịa khóa học. */
    public PageResponse<PublicCourseCardResponse> recommendCourses(GuidedRecommendationRequest request) {
        return catalogService.recommendCourses(request.categoryId(), request.level(), request.goal(),
                request.limit() == null ? 6 : request.limit());
    }

    /** Tạo visitor cùng conversation và trả rõ hai ID để client không dùng nhầm visitor ID. */
    @Transactional
    public VisitorSessionResponse createVisitor() {
        String token = UUID.randomUUID() + "." + UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        AnonymousVisitorEntity visitor = visitorRepository.save(AnonymousVisitorEntity.builder()
                .visitorTokenHash(hash(token))
                .firstSeenAt(now).lastSeenAt(now).status(BaseStatusEnum.ACTIVE).build());
        SupportConversationResponse conversation = createConversation(visitor);
        return new VisitorSessionResponse(String.valueOf(visitor.getId()), token,
                String.valueOf(conversation.id()));
    }

    /** Trả danh sách quick reply được backend kiểm soát cho trạng thái ban đầu. */
    public List<SupportOptionResponse> getOptions() {
        return List.of(
                new SupportOptionResponse("COURSE_CONSULTING", "Tìm khóa học phù hợp", "SHOW_OPTIONS"),
                new SupportOptionResponse("LEARNING_PATH", "Tư vấn lộ trình học", "SHOW_OPTIONS"),
                new SupportOptionResponse("PRICING", "Xem học phí và gói học", "SHOW_TEMPLATE"),
                new SupportOptionResponse("DELIVERY", "Tìm hiểu hình thức học", "SHOW_TEMPLATE"),
                new SupportOptionResponse("POLICY", "Chính sách thanh toán/hoàn tiền", "SHOW_TEMPLATE"),
                new SupportOptionResponse("REQUEST_AGENT", "Kết nối với tư vấn viên", "COLLECT_CONTACT"));
    }

    /** Tạo hoặc khôi phục conversation guided hiện tại của visitor. */
    @Transactional
    public SupportConversationResponse currentConversation(String token) {
        AnonymousVisitorEntity visitor = requireVisitor(token);
        return conversationRepository.findFirstByVisitor_IdAndStatusInOrderByCreatedAtDesc(visitor.getId(), OPEN_STATUSES)
                .map(this::toConversation).orElseGet(() -> createConversation(visitor));
    }

    /** Tạo conversation mới, nhưng trả lại ticket cũ nếu visitor còn một phiên đang mở. */
    @Transactional
    public SupportConversationResponse createConversation(String token) {
        AnonymousVisitorEntity visitor = requireVisitor(token);
        return createConversation(visitor);
    }

    /** Đóng phiên mở hiện tại theo yêu cầu rõ ràng rồi tạo conversation guided mới. */
    @Transactional
    public SupportConversationResponse startNewConversation(String token) {
        AnonymousVisitorEntity visitor = requireVisitor(token);
        conversationRepository.findFirstByVisitor_IdAndStatusInOrderByCreatedAtDesc(visitor.getId(), OPEN_STATUSES)
                .ifPresent(current -> {
                    if (EnumSet.of(SupportConversationStatusEnum.QUEUED, SupportConversationStatusEnum.ASSIGNED,
                            SupportConversationStatusEnum.ACTIVE,
                            SupportConversationStatusEnum.WAITING_CONFIRMATION).contains(current.getStatus())) {
                        throw new BusinessException("Không thể tạo cuộc trò chuyện mới khi yêu cầu tư vấn đang mở");
                    }
                    saveMessage(current, SupportMessageSenderEnum.SYSTEM, SupportMessageTypeEnum.SYSTEM,
                            "Visitor đã kết thúc phiên này để tạo cuộc trò chuyện mới.", null);
                    releaseAssignedHr(current);
                    current.setStatus(SupportConversationStatusEnum.CLOSED);
                    current.setEndedAt(LocalDateTime.now());
                    current.setCloseReason("VISITOR_STARTED_NEW_CONVERSATION");
                });
        SupportConversationEntity conversation = conversationRepository.save(SupportConversationEntity.builder()
                .visitor(visitor).status(SupportConversationStatusEnum.GUIDED).build());
        saveMessage(conversation, SupportMessageSenderEnum.BOT, SupportMessageTypeEnum.TEXT,
                "Xin chào! Bạn cần tư vấn nội dung gì?", null);
        return toConversation(conversation);
    }

    /** Tạo conversation và ghi lời chào BOT vào database. */
    private SupportConversationResponse createConversation(AnonymousVisitorEntity visitor) {
        SupportConversationEntity existing = conversationRepository
                .findFirstByVisitor_IdAndStatusInOrderByCreatedAtDesc(visitor.getId(), OPEN_STATUSES).orElse(null);
        if (existing != null) return toConversation(existing);
        SupportConversationEntity conversation = conversationRepository.save(SupportConversationEntity.builder()
                .visitor(visitor).status(SupportConversationStatusEnum.GUIDED).build());
        saveMessage(conversation, SupportMessageSenderEnum.BOT, SupportMessageTypeEnum.TEXT,
                "Xin chào! Bạn cần tư vấn nội dung gì?", null);
        return toConversation(conversation);
    }

    /** Xử lý option bằng ID, trả template hoặc dữ liệu catalog thật tương ứng. */
    @Transactional
    public SupportMessageResponse handleQuickReply(Long conversationId, String token, QuickReplyRequest request) {
        SupportConversationEntity conversation = requireVisitorConversation(conversationId, token);
        ensureStatus(conversation, EnumSet.of(SupportConversationStatusEnum.GUIDED,
                SupportConversationStatusEnum.COLLECTING_CONTACT, SupportConversationStatusEnum.WAITING_CONFIRMATION));
        String optionId = request.optionId();
        if ("KEEP_ACTIVE".equals(optionId)) {
            conversation.setStatus(SupportConversationStatusEnum.ACTIVE);
            conversation.setLastVisitorMessageAt(LocalDateTime.now());
            conversation.setCloseRequestedAt(null);
            return saveMessage(conversation, SupportMessageSenderEnum.SYSTEM, SupportMessageTypeEnum.SYSTEM,
                    "Cuộc trò chuyện tiếp tục với tư vấn viên.", null);
        }
        if ("CLOSE".equals(optionId)) {
            releaseAssignedHr(conversation);
            conversation.setStatus(SupportConversationStatusEnum.CLOSED);
            conversation.setEndedAt(LocalDateTime.now());
            conversation.setCloseReason("VISITOR_CONFIRMED_CLOSE");
            return saveMessage(conversation, SupportMessageSenderEnum.SYSTEM, SupportMessageTypeEnum.SYSTEM,
                    "Cảm ơn bạn. Cuộc trò chuyện đã được đóng.", null);
        }
        if (conversation.getStatus() == SupportConversationStatusEnum.COLLECTING_CONTACT
                && !"REQUEST_AGENT".equals(optionId)) {
            conversation.setStatus(SupportConversationStatusEnum.GUIDED);
        }
        saveMessage(conversation, SupportMessageSenderEnum.VISITOR, SupportMessageTypeEnum.TEXT,
                labelForOption(optionId), null);
        if ("COURSE_CONSULTING".equals(optionId)) {
            conversation.setGuidedContext(writeJson(Map.of("flow", "COURSE_CONSULTING", "step", "CATEGORY",
                    "categoryIds", List.of())));
            return categoryQuestion(conversation);
        }
        if ("LEARNING_PATH".equals(optionId)) {
            conversation.setGuidedContext(writeJson(Map.of("flow", optionId, "step", "TIME")));
            return quickQuestion(conversation, "Bạn dự kiến dành bao nhiêu thời gian để học mỗi tuần?", List.of(
                    option("TIME_UNDER_3", "Dưới 3 giờ/tuần"), option("TIME_3_5", "3–5 giờ/tuần"),
                    option("TIME_6_10", "6–10 giờ/tuần"), option("TIME_OVER_10", "Trên 10 giờ/tuần")), null, false);
        }
        if ("PRICING".equals(optionId)) {
            conversation.setGuidedContext(writeJson(Map.of("flow", optionId, "step", "BUDGET")));
            return quickQuestion(conversation, "Ngân sách bạn mong muốn dành cho việc học là bao nhiêu?",
                    List.of(), "BUDGET", false);
        }
        if ("DELIVERY".equals(optionId)) {
            String context = deliveryContext();
            String answer = publicAiChatService.answerSupportGuidance("DELIVERY",
                    "Giải thích rõ ba hình thức học của AILMS, ưu nhược điểm và đối tượng phù hợp.", context);
            return saveMessage(conversation, SupportMessageSenderEnum.BOT, SupportMessageTypeEnum.TEXT, answer, null);
        }
        if ("POLICY".equals(optionId)) {
            String policyName = currentPolicy().map(FileMetadataEntity::getOriginalName).orElse("Chưa có policy active");
            String answer = publicAiChatService.answerSupportGuidance("POLICY",
                    "Tóm tắt chính sách thanh toán và hoàn tiền hiện hành. Không tự quyết định trường hợp cá nhân.",
                    "Policy hiện hành: " + policyName);
            List<SupportResourceResponse> resources = currentPolicyResource();
            return saveMessage(conversation, SupportMessageSenderEnum.BOT,
                    resources.isEmpty() ? SupportMessageTypeEnum.TEXT : SupportMessageTypeEnum.RESOURCE_CARD,
                    answer, resources.isEmpty() ? null : writeJson(Map.of("resources", resources)));
        }
        if ("CATEGORY_DONE".equals(optionId)) {
            List<Long> selected = extractContextIds(conversation.getGuidedContext(), "categoryIds");
            if (selected.isEmpty()) throw new BusinessException("Vui lòng chọn ít nhất một chủ đề");
            conversation.setGuidedContext(mergeContext(conversation.getGuidedContext(), Map.of("step", "COURSE_QUERY")));
            return quickQuestion(conversation, "Bạn muốn học khóa học hoặc kỹ năng cụ thể nào? Hãy mô tả ngắn gọn.",
                    List.of(), "COURSE_QUERY", false);
        }
        if (optionId.startsWith("CATEGORY_")) {
            Long categoryId = parseId(optionId.substring("CATEGORY_".length()));
            categoryRepository.findById(categoryId).orElseThrow(() -> ResourceNotFoundException.of("Category", categoryId));
            if (!"CATEGORY".equals(extractContext(conversation.getGuidedContext(), "step"))) {
                throw new IllegalArgumentException("Bước chọn danh mục đã kết thúc");
            }
            List<Long> selected = new java.util.ArrayList<>(extractContextIds(conversation.getGuidedContext(), "categoryIds"));
            if (selected.contains(categoryId)) selected.remove(categoryId); else selected.add(categoryId);
            conversation.setGuidedContext(mergeContext(conversation.getGuidedContext(), Map.of("categoryIds", selected)));
            return categoryQuestion(conversation);
        }
        if (optionId.startsWith("TIME_")) {
            if (!"LEARNING_PATH".equals(extractContext(conversation.getGuidedContext(), "flow"))) {
                throw new IllegalArgumentException("Lựa chọn thời gian không hợp lệ");
            }
            conversation.setGuidedContext(mergeContext(conversation.getGuidedContext(),
                    Map.of("time", labelForOption(optionId), "step", "DELIVERY_MODE")));
            return quickQuestion(conversation, "Bạn muốn học theo hình thức nào?", deliveryOptions(), null, false);
        }
        if (optionId.startsWith("MODE_")) {
            String flow = extractContext(conversation.getGuidedContext(), "flow");
            if ("LEARNING_PATH".equals(flow)) {
                conversation.setGuidedContext(mergeContext(conversation.getGuidedContext(),
                        Map.of("deliveryMode", labelForOption(optionId), "step", "CATEGORY", "categoryIds", List.of())));
                return categoryQuestion(conversation);
            }
            if ("PRICING".equals(flow)) {
                conversation.setGuidedContext(mergeContext(conversation.getGuidedContext(),
                        Map.of("deliveryMode", labelForOption(optionId), "step", "DONE")));
                String answer = publicAiChatService.answerSupportGuidance("PRICING",
                        "Tư vấn loại gói phù hợp theo ngân sách. Không liệt kê khóa học cụ thể.", pricingContext(conversation));
                return saveMessage(conversation, SupportMessageSenderEnum.BOT, SupportMessageTypeEnum.TEXT, answer, null);
            }
            throw new IllegalArgumentException("Lựa chọn hình thức không hợp lệ");
        }
        if ("REQUEST_AGENT".equals(optionId)) {
            conversation.setStatus(SupportConversationStatusEnum.COLLECTING_CONTACT);
            return saveMessage(conversation, SupportMessageSenderEnum.BOT, SupportMessageTypeEnum.TEXT,
                    "Nội dung này cần được tư vấn viên hỗ trợ trực tiếp. Vui lòng để lại số điện thoại để chúng tôi kết nối với bạn.", null);
        }
        if (optionId.startsWith("GOAL_")) {
            return recommendCourses(conversation, optionId.substring("GOAL_".length()));
        }
        throw new IllegalArgumentException("Option không hợp lệ hoặc đã hết hạn");
    }

    /** Nhận mô tả tự do trong GUIDED và chỉ dùng embedding để gợi ý quick intent phù hợp. */
    @Transactional
    public SupportMessageResponse suggestQuickReplies(Long conversationId, String token, SupportMessageRequest request) {
        SupportConversationEntity conversation = requireVisitorConversation(conversationId, token);
        ensureStatus(conversation, EnumSet.of(SupportConversationStatusEnum.GUIDED));
        String question = request.content().trim();
        saveMessage(conversation, SupportMessageSenderEnum.VISITOR, SupportMessageTypeEnum.TEXT, question, null);
        String flow = extractContext(conversation.getGuidedContext(), "flow");
        String step = extractContext(conversation.getGuidedContext(), "step");
        if ("PRICING".equals(flow) && "BUDGET".equals(step)) {
            if (!question.matches(".*\\d.*")) {
                return quickQuestion(conversation, "Vui lòng nhập ngân sách có số tiền cụ thể, ví dụ 2.000.000 VNĐ.",
                        List.of(), "BUDGET", false);
            }
            conversation.setGuidedContext(mergeContext(conversation.getGuidedContext(),
                    Map.of("budget", question, "step", "DELIVERY_MODE")));
            return quickQuestion(conversation, "Bạn quan tâm loại gói học nào?", deliveryOptions(), null, false);
        }
        if ("COURSE_QUERY".equals(step) && ("COURSE_CONSULTING".equals(flow) || "LEARNING_PATH".equals(flow))) {
            conversation.setGuidedContext(mergeContext(conversation.getGuidedContext(),
                    Map.of("courseQuery", question, "step", "DONE")));
            List<PublicCourseCardResponse> courses = findGuidedCourses(conversation, question, 3);
            if ("COURSE_CONSULTING".equals(flow)) {
                return saveMessage(conversation, SupportMessageSenderEnum.BOT, SupportMessageTypeEnum.COURSE_RESULTS,
                        courses.isEmpty() ? "Hiện chưa có khóa học thuộc các chủ đề bạn chọn."
                                : "Đây là 3 khóa học liên quan nhất từ dữ liệu hiện có của AILMS.",
                        writeJson(Map.of("courses", courses)));
            }
            String answer = publicAiChatService.answerSupportGuidance("LEARNING_PATH",
                    "Xây dựng lộ trình học chuyên nghiệp theo thứ tự, thời lượng và hình thức đã chọn. Chỉ dùng khóa học được cung cấp.",
                    learningPathContext(conversation, courses));
            return saveMessage(conversation, SupportMessageSenderEnum.BOT, SupportMessageTypeEnum.COURSE_RESULTS,
                    answer, writeJson(Map.of("presentation", "LEARNING_PATH", "courses", courses)));
        }
        List<Map<String, String>> suggestions;
        try {
            suggestions = publicAiChatService.suggestSupportIntents(question).stream()
                    .filter(item -> item.score() >= 0.35).limit(3)
                    .map(item -> Map.of("id", item.optionId(), "label", labelForOption(item.optionId())))
                    .toList();
        } catch (RuntimeException exception) {
            suggestions = List.of();
        }
        if (suggestions.isEmpty()) {
            suggestions = getOptions().stream().filter(item -> !"REQUEST_AGENT".equals(item.id())).limit(3)
                    .map(item -> Map.of("id", item.id(), "label", item.label())).toList();
        }
        return saveMessage(conversation, SupportMessageSenderEnum.BOT, SupportMessageTypeEnum.QUICK_REPLIES,
                "Mình gợi ý các nội dung gần nhất với nhu cầu của bạn. Hãy chọn một mục để bổ sung ngữ cảnh.",
                writeJson(suggestions));
    }

    /** Lưu contact và đưa mọi yêu cầu vào hàng đợi chung để supporter chủ động nhận. */
    @Transactional
    public SupportConversationResponse saveContact(Long conversationId, String token, ContactRequest request) {
        SupportConversationEntity conversation = requireVisitorConversation(conversationId, token);
        ensureStatus(conversation, EnumSet.of(SupportConversationStatusEnum.COLLECTING_CONTACT,
                SupportConversationStatusEnum.GUIDED));
        conversation.setFullName(request.fullName().trim());
        conversation.setPhone(request.phone() == null || request.phone().isBlank() ? null : request.phone().trim());
        conversation.setEmail(request.email().trim().toLowerCase(java.util.Locale.ROOT));
        conversation.setStatus(SupportConversationStatusEnum.QUEUED);
        if (request.note() != null && !request.note().isBlank()) {
            saveMessage(conversation, SupportMessageSenderEnum.VISITOR, SupportMessageTypeEnum.TEXT, request.note(), null);
        }
        refreshQueue(conversation);
        return toConversation(conversation);
    }

    /** Gửi tin nhắn visitor, chỉ cho phép sau khi HR đã accept ACTIVE. */
    @Transactional
    public SupportMessageResponse sendVisitorMessage(Long conversationId, String token, SupportMessageRequest request) {
        SupportConversationEntity conversation = requireVisitorConversation(conversationId, token);
        ensureStatus(conversation, EnumSet.of(SupportConversationStatusEnum.ACTIVE));
        return saveMessage(conversation, SupportMessageSenderEnum.VISITOR, SupportMessageTypeEnum.TEXT,
                request.content().trim(), null);
    }

    /** Xác thực và lưu file visitor, sau đó phát message attachment realtime. */
    @Transactional
    public SupportMessageResponse uploadVisitorAttachment(Long conversationId, String token, MultipartFile file) {
        SupportConversationEntity conversation = requireVisitorConversation(conversationId, token);
        ensureStatus(conversation, EnumSet.of(SupportConversationStatusEnum.ACTIVE));
        return saveAttachment(conversation, SupportMessageSenderEnum.VISITOR, file);
    }

    /** Lấy message của visitor sau khi xác thực visitor token sở hữu conversation. */
    public PageResponse<SupportMessageResponse> getMessages(Long conversationId, String token, int page, int size) {
        requireVisitorConversation(conversationId, token);
        return PageResponse.from(messageRepository.findByConversation_IdOrderByCreatedAtAsc(conversationId,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100))).map(this::toMessage));
    }

    /** Chặn visitor tự hủy ticket để tránh bỏ ngang hàng đợi hoặc phiên đang hỗ trợ. */
    @Transactional
    public SupportConversationResponse cancel(Long conversationId, String token) {
        requireVisitorConversation(conversationId, token);
        throw new BusinessException("Yêu cầu tư vấn không thể hủy. Hệ thống sẽ tự xử lý theo thời gian chờ");
    }

    /** Đóng conversation theo lựa chọn cảm ơn của visitor. */
    @Transactional
    public SupportConversationResponse close(Long conversationId, String token) {
        SupportConversationEntity conversation = requireVisitorConversation(conversationId, token);
        ensureStatus(conversation, EnumSet.of(SupportConversationStatusEnum.ACTIVE,
                SupportConversationStatusEnum.WAITING_CONFIRMATION, SupportConversationStatusEnum.GUIDED));
        releaseAssignedHr(conversation);
        conversation.setStatus(SupportConversationStatusEnum.CLOSED);
        conversation.setEndedAt(LocalDateTime.now());
        conversation.setCloseReason("VISITOR_CLOSED");
        return toConversation(conversation);
    }

    /** Lấy lịch sử conversation đã xác thực của visitor. */
    public PageResponse<SupportConversationResponse> history(String token, int page, int size) {
        AnonymousVisitorEntity visitor = requireVisitor(token);
        return PageResponse.from(conversationRepository.findByVisitor_IdOrderByCreatedAtDesc(visitor.getId(),
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50))).map(this::toConversation));
    }

    /** Lấy chi tiết conversation của visitor sau khi kiểm tra quyền sở hữu bằng token. */
    public SupportConversationResponse getConversation(Long conversationId, String token) {
        return toConversation(requireVisitorConversation(conversationId, token));
    }

    /** Xác thực visitor token cho WebSocket CONNECT và trả visitor ID nội bộ. */
    public String resolveVisitorId(String token) {
        return String.valueOf(requireVisitor(token).getId());
    }

    /** Kiểm tra principal visitor/support chỉ được subscribe đúng conversation của mình. */
    public boolean canAccessRealtime(Long conversationId, Principal principal) {
        if (principal == null || principal.getName() == null) return false;
        if (principal.getName().startsWith("visitor:")) {
            return conversationRepository.findById(conversationId)
                    .map(item -> String.valueOf(item.getVisitor().getId()).equals(principal.getName().substring("visitor:".length())))
                    .orElse(false);
        }
        try {
            Long userId = principal instanceof org.springframework.security.core.Authentication authentication
                    && authentication.getPrincipal() instanceof CustomUserDetails details
                    ? details.getUser().getId() : Long.valueOf(principal.getName());
            return conversationRepository.findById(conversationId)
                    .map(item -> item.getAssignedHr() != null && item.getAssignedHr().getId().equals(userId))
                    .orElse(false);
        } catch (NumberFormatException exception) {
            return false;
        }
    }

    /** Gửi tin nhắn realtime của visitor sau khi interceptor đã xác thực ownership. */
    @Transactional
    public SupportMessageResponse sendVisitorMessageByVisitorId(Long conversationId, String visitorId,
                                                                 SupportMessageRequest request) {
        SupportConversationEntity conversation = conversationRepository.findById(conversationId)
                .filter(item -> String.valueOf(item.getVisitor().getId()).equals(visitorId))
                .orElseThrow(() -> ResourceNotFoundException.of("Support conversation", conversationId));
        ensureStatus(conversation, EnumSet.of(SupportConversationStatusEnum.ACTIVE));
        return saveMessage(conversation, SupportMessageSenderEnum.VISITOR, SupportMessageTypeEnum.TEXT,
                request.content().trim(), null);
    }

    /** Cập nhật trạng thái presence và heartbeat của HR hiện tại. */
    @Transactional
    public void updatePresence(CustomUserDetails currentUser, PresenceRequest request) {
        Long hrId = currentUser.getUser().getId();
        SupportHrPresenceEntity presence = presenceRepository.findByHrId(hrId).orElseGet(() ->
                SupportHrPresenceEntity.builder().hrId(hrId).build());
        Collection<SupportConversationStatusEnum> workloadStatuses = EnumSet.of(
                SupportConversationStatusEnum.ASSIGNED, SupportConversationStatusEnum.ACTIVE,
                SupportConversationStatusEnum.WAITING_CONFIRMATION);
        boolean hasWorkload = conversationRepository.countByAssignedHr_IdAndStatusIn(hrId, workloadStatuses) > 0;
        presence.setStatus(request.status() == SupportHrPresenceStatusEnum.OFFLINE
                ? SupportHrPresenceStatusEnum.OFFLINE
                : hasWorkload ? SupportHrPresenceStatusEnum.ONLINE_BUSY : SupportHrPresenceStatusEnum.ONLINE_AVAILABLE);
        presence.setLastHeartbeatAt(LocalDateTime.now());
        presenceRepository.save(presence);
        if (presence.getStatus() == SupportHrPresenceStatusEnum.OFFLINE) {
            conversationRepository.requeueFromOfflineSupporter(hrId, workloadStatuses);
        }
    }

    /** Trả queue FIFO cho HR đang đăng nhập, không lộ token visitor. */
    @Transactional
    public SupportQueueResponse getQueue() {
        return new SupportQueueResponse(conversationRepository.findByStatusOrderByCreatedAtAsc(
                SupportConversationStatusEnum.QUEUED).stream().peek(this::refreshQueue).map(this::toConversation).toList());
    }

    /** Lấy cuộc trò chuyện hiện tại và lịch sử đã kết thúc của supporter. */
    @Transactional
    public SupportQueueResponse getHrConversations(CustomUserDetails currentUser) {
        return new SupportQueueResponse(conversationRepository.findByAssignedHr_IdAndStatusIn(currentUser.getUser().getId(),
                EnumSet.of(SupportConversationStatusEnum.ASSIGNED, SupportConversationStatusEnum.ACTIVE,
                        SupportConversationStatusEnum.WAITING_CONFIRMATION, SupportConversationStatusEnum.CLOSED,
                        SupportConversationStatusEnum.CANCELLED, SupportConversationStatusEnum.EXPIRED), PageRequest.of(0, 100,
                        Sort.by(Sort.Direction.DESC, "createdAt"))).getContent().stream().map(this::toConversation).toList());
    }

    /** HR đọc chi tiết một conversation đã được phân công cho chính mình. */
    @Transactional
    public SupportConversationResponse getHrConversation(Long conversationId, CustomUserDetails currentUser) {
        return toConversation(requireHrConversation(conversationId, currentUser));
    }

    /** HR đọc message của conversation được phân công mà không cần visitor token. */
    @Transactional
    public PageResponse<SupportMessageResponse> getHrMessages(Long conversationId, CustomUserDetails currentUser,
                                                               int page, int size) {
        requireHrConversation(conversationId, currentUser);
        return PageResponse.from(messageRepository.findByConversation_IdOrderByCreatedAtAsc(conversationId,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100))).map(this::toMessage));
    }

    /** Supporter claim ticket đang QUEUED; khóa DB bảo đảm chỉ một người nhận được. */
    @Transactional
    public SupportConversationResponse accept(Long conversationId, CustomUserDetails currentUser) {
        Long hrId = currentUser.getUser().getId();
        SupportHrPresenceEntity presence = presenceRepository.findByHrIdForUpdate(hrId).orElseGet(() ->
                presenceRepository.save(SupportHrPresenceEntity.builder().hrId(hrId).build()));
        Collection<SupportConversationStatusEnum> activeStatuses = EnumSet.of(
                SupportConversationStatusEnum.ACTIVE, SupportConversationStatusEnum.WAITING_CONFIRMATION);
        if (conversationRepository.countByAssignedHr_IdAndStatusIn(hrId, activeStatuses) > 0) {
            throw new BusinessException("Mỗi tư vấn viên chỉ được xử lý một cuộc trò chuyện tại một thời điểm");
        }
        SupportConversationEntity conversation = conversationRepository.findByIdForUpdate(conversationId)
                .orElseThrow(() -> ResourceNotFoundException.of("Support conversation", conversationId));
        if (conversation.getStatus() == SupportConversationStatusEnum.ASSIGNED) {
            if (conversation.getAssignedHr() == null || !conversation.getAssignedHr().getId().equals(hrId)) {
                throw new BusinessException("Ticket đã được tư vấn viên khác tiếp nhận");
            }
        } else {
            ensureStatus(conversation, EnumSet.of(SupportConversationStatusEnum.QUEUED));
            conversation.setAssignedHr(currentUser.getUser());
        }
        conversation.setStatus(SupportConversationStatusEnum.ACTIVE);
        conversation.setStartedAt(LocalDateTime.now());
        conversation.setQueuePosition(null);
        conversation.setEstimatedWaitMinutes(null);
        presence.setStatus(SupportHrPresenceStatusEnum.ONLINE_BUSY);
        presence.setLastHeartbeatAt(LocalDateTime.now());
        presenceRepository.save(presence);
        saveMessage(conversation, SupportMessageSenderEnum.SYSTEM, SupportMessageTypeEnum.SYSTEM,
                "Tư vấn viên đã tham gia cuộc trò chuyện.", null);
        return toConversation(conversation);
    }

    /** HR gửi message tự do trong conversation được phân công và đang ACTIVE. */
    @Transactional
    public SupportMessageResponse sendHrMessage(Long conversationId, CustomUserDetails currentUser,
                                                 SupportMessageRequest request) {
        SupportConversationEntity conversation = requireHrConversation(conversationId, currentUser);
        ensureStatus(conversation, EnumSet.of(SupportConversationStatusEnum.ACTIVE));
        return saveMessage(conversation, SupportMessageSenderEnum.HR, SupportMessageTypeEnum.TEXT,
                request.content().trim(), null);
    }

    /** Xác thực và lưu file tư vấn viên, sau đó phát message attachment realtime. */
    @Transactional
    public SupportMessageResponse uploadHrAttachment(Long conversationId, CustomUserDetails currentUser,
                                                      MultipartFile file) {
        SupportConversationEntity conversation = requireHrConversation(conversationId, currentUser);
        ensureStatus(conversation, EnumSet.of(SupportConversationStatusEnum.ACTIVE));
        return saveAttachment(conversation, SupportMessageSenderEnum.HR, file);
    }

    /** Tìm riêng khóa học đang có gói bán qua Meilisearch cho picker Support. */
    public List<SupportResourceResponse> searchResources(String query, int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 30);
        String keyword = query == null ? "" : query.trim();
        CourseSearchRequest request = new CourseSearchRequest();
        request.setKeyword(keyword);
        request.setStatus(CourseStatusEnum.ACTIVE);
        request.setPage(0);
        request.setSize(safeLimit);
        PageResponse<CourseResponse> indexed = meilisearchCourseService.search(request);
        if (indexed != null) {
            return indexed.getContent().stream().map(this::toCourseResource).toList();
        }
        return courseRepository.findActiveCoursesForSale(keyword.isBlank() ? null : keyword, null, null,
                        PageRequest.of(0, safeLimit)).getContent().stream()
                .map(this::toCourseResource).toList();
    }

    /** Gửi tài nguyên catalog sau khi kiểm tra trạng thái public tại thời điểm gửi. */
    @Transactional
    public SupportMessageResponse sendHrResource(Long conversationId, CustomUserDetails currentUser,
                                                  SupportResourceRequest request) {
        SupportConversationEntity conversation = requireHrConversation(conversationId, currentUser);
        ensureStatus(conversation, EnumSet.of(SupportConversationStatusEnum.ACTIVE));
        SupportResourceResponse resource = resolveResource(request.resourceType(), parseId(request.resourceId()));
        return saveMessage(conversation, SupportMessageSenderEnum.HR, SupportMessageTypeEnum.RESOURCE_CARD,
                "Tư vấn viên đã gửi một nội dung tham khảo.", writeJson(Map.of("resources", List.of(resource))));
    }

    /** HR yêu cầu visitor xác nhận trước khi đóng phiên. */
    @Transactional
    public SupportConversationResponse requestClose(Long conversationId, CustomUserDetails currentUser) {
        SupportConversationEntity conversation = requireHrConversation(conversationId, currentUser);
        ensureStatus(conversation, EnumSet.of(SupportConversationStatusEnum.ACTIVE));
        LocalDateTime availableAt = requestCloseAvailableAt(conversation);
        if (availableAt == null) {
            throw new BusinessException("Chỉ có thể yêu cầu đóng sau khi đã gửi tin và đang chờ visitor phản hồi");
        }
        if (LocalDateTime.now().isBefore(availableAt)) {
            throw new BusinessException("Visitor chưa quá 5 phút không phản hồi");
        }
        conversation.setStatus(SupportConversationStatusEnum.WAITING_CONFIRMATION);
        conversation.setCloseRequestedAt(LocalDateTime.now());
        saveMessage(conversation, SupportMessageSenderEnum.HR, SupportMessageTypeEnum.QUICK_REPLIES,
                "Bạn còn câu hỏi nào cần được hỗ trợ không?", writeJson(List.of(
                        Map.of("id", "KEEP_ACTIVE", "label", "Tiếp tục trò chuyện"),
                        Map.of("id", "CLOSE", "label", "Đồng ý đóng"))));
        return toConversation(conversation);
    }

    /** Chặn supporter đóng trực tiếp; chỉ scheduler hoặc visitor được xác nhận đóng. */
    @Transactional
    public SupportConversationResponse closeByHr(Long conversationId, CustomUserDetails currentUser) {
        requireHrConversation(conversationId, currentUser);
        throw new BusinessException("Tư vấn viên chỉ được gửi yêu cầu đóng; hệ thống sẽ tự đóng khi visitor không phản hồi");
    }

    /** Tự đóng phiên khi visitor không trả lời nội dung gần nhất của supporter quá 20 phút. */
    @Transactional
    public void closeVisitorResponseTimeouts() {
        LocalDateTime now = LocalDateTime.now();
        List<SupportConversationEntity> conversations = conversationRepository.findByStatusIn(EnumSet.of(
                SupportConversationStatusEnum.ACTIVE, SupportConversationStatusEnum.WAITING_CONFIRMATION));
        conversations.stream().filter(item -> {
            LocalDateTime autoCloseAt = autoCloseAt(item);
            return autoCloseAt != null && !now.isBefore(autoCloseAt);
        }).forEach(item -> {
            releaseAssignedHr(item);
            item.setStatus(SupportConversationStatusEnum.CLOSED);
            item.setEndedAt(now);
            item.setCloseReason("VISITOR_RESPONSE_TIMEOUT");
            saveMessage(item, SupportMessageSenderEnum.SYSTEM, SupportMessageTypeEnum.SYSTEM,
                    "Cuộc trò chuyện đã tự động đóng vì visitor không phản hồi trong 20 phút.", null);
        });
    }

    /** Tìm visitor bằng token hash và cập nhật last seen. */
    private AnonymousVisitorEntity requireVisitor(String token) {
        if (token == null || token.isBlank()) throw new IllegalArgumentException("Thiếu visitor token");
        AnonymousVisitorEntity visitor = visitorRepository.findByVisitorTokenHash(hash(token))
                .filter(item -> item.getStatus() == BaseStatusEnum.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor session không hợp lệ"));
        visitor.setLastSeenAt(LocalDateTime.now());
        return visitor;
    }

    /** Kiểm tra visitor sở hữu conversation trước mọi thao tác đọc/ghi. */
    private SupportConversationEntity requireVisitorConversation(Long id, String token) {
        AnonymousVisitorEntity visitor = requireVisitor(token);
        return conversationRepository.findById(id).filter(item -> item.getVisitor().getId().equals(visitor.getId()))
                .orElseThrow(() -> ResourceNotFoundException.of("Support conversation", id));
    }

    /** Kiểm tra HR chỉ thao tác conversation được phân công cho chính mình. */
    private SupportConversationEntity requireHrConversation(Long id, CustomUserDetails currentUser) {
        return conversationRepository.findByIdForUpdate(id)
                .filter(item -> item.getAssignedHr() != null && item.getAssignedHr().getId().equals(currentUser.getUser().getId()))
                .orElseThrow(() -> ResourceNotFoundException.of("Assigned support conversation", id));
    }

    /** Validate dung lượng/định dạng, upload MinIO và lưu metadata attachment an toàn. */
    private SupportMessageResponse saveAttachment(SupportConversationEntity conversation,
                                                  SupportMessageSenderEnum sender, MultipartFile file) {
        if (file == null || file.isEmpty()) throw new BusinessException("Vui lòng chọn tệp cần gửi");
        if (file.getSize() > 10 * 1024 * 1024L) throw new BusinessException("Tệp vượt quá giới hạn 10MB");
        String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
        if (!allowedAttachmentTypes().contains(contentType)) {
            throw new BusinessException("Định dạng tệp không hỗ trợ. Chỉ nhận JPG, PNG, WEBP, GIF, PDF, DOCX, XLSX và TXT");
        }
        String originalName = file.getOriginalFilename() == null ? "attachment" : file.getOriginalFilename();
        String safeName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String fileKey = "support/" + conversation.getId() + "/" + UUID.randomUUID() + "-" + safeName;
        try {
            fileStorageService.upload(file, fileKey);
            Map<String, Object> metadata = new java.util.HashMap<>();
            metadata.put("fileKey", fileKey);
            metadata.put("fileName", originalName);
            metadata.put("contentType", contentType);
            metadata.put("size", file.getSize());
            metadata.put("url", fileStorageService.getPresignedUrl(fileKey, Duration.ofHours(24)));
            return saveMessage(conversation, sender, SupportMessageTypeEnum.ATTACHMENT,
                    originalName, writeJson(metadata));
        } catch (RuntimeException exception) {
            if (fileStorageService.exists(fileKey)) fileStorageService.delete(fileKey);
            throw exception;
        }
    }

    /** Danh sách MIME không thực thi script, dùng chung cho hai phía conversation. */
    private java.util.Set<String> allowedAttachmentTypes() {
        return java.util.Set.of("image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain");
    }

    /** Tạo quick reply metadata có mode nhập liệu để frontend chỉ render đúng bước hiện tại. */
    private SupportMessageResponse quickQuestion(SupportConversationEntity conversation, String question,
                                                 List<Map<String, String>> options, String inputMode,
                                                 boolean multiple) {
        Map<String, Object> metadata = new java.util.HashMap<>();
        metadata.put("options", options);
        metadata.put("selectionMode", multiple ? "MULTIPLE" : "SINGLE");
        if (inputMode != null) metadata.put("inputMode", inputMode);
        return saveMessage(conversation, SupportMessageSenderEnum.BOT, SupportMessageTypeEnum.QUICK_REPLIES,
                question, writeJson(metadata));
    }

    /** Tạo option map ổn định cho quick reply. */
    private Map<String, String> option(String id, String label) {
        return Map.of("id", id, "label", label);
    }

    /** Hiển thị category public và cho phép bật/tắt nhiều lựa chọn trước khi hoàn tất. */
    private SupportMessageResponse categoryQuestion(SupportConversationEntity conversation) {
        List<Long> selected = extractContextIds(conversation.getGuidedContext(), "categoryIds");
        List<Map<String, String>> options = new java.util.ArrayList<>();
        categoryRepository.findPublicCategoryCourseCounts(BaseStatusEnum.ACTIVE).stream().limit(20).forEach(item -> {
            Long id = parseId(String.valueOf(item[0]));
            String label = String.valueOf(item[1]);
            options.add(option("CATEGORY_" + id, selected.contains(id) ? "✓ " + label : label));
        });
        if (!selected.isEmpty()) options.add(option("CATEGORY_DONE", "Tiếp tục với " + selected.size() + " chủ đề"));
        return quickQuestion(conversation, "Chọn một hoặc nhiều chủ đề bạn quan tâm, sau đó nhấn Tiếp tục.",
                options, null, true);
    }

    /** Trả ba hình thức học chuẩn của hệ thống dưới dạng quick reply. */
    private List<Map<String, String>> deliveryOptions() {
        return List.of(option("MODE_SELF_STUDY", "Tự học"), option("MODE_GROUP_CLASS", "Học nhóm"),
                option("MODE_ONE_ON_ONE", "Gia sư 1-1"));
    }

    /** Tìm tối đa N course gần nghĩa trong các category đã chọn và fallback theo category. */
    private List<PublicCourseCardResponse> findGuidedCourses(SupportConversationEntity conversation,
                                                            String query, int limit) {
        java.util.LinkedHashMap<Long, PublicCourseCardResponse> ranked = new java.util.LinkedHashMap<>();
        List<Long> categoryIds = extractContextIds(conversation.getGuidedContext(), "categoryIds");
        for (Long categoryId : categoryIds) {
            catalogService.recommendCourses(categoryId, null, query, limit).getContent()
                    .forEach(course -> ranked.putIfAbsent(course.getId(), course));
            if (ranked.size() >= limit) break;
        }
        if (ranked.isEmpty()) {
            for (Long categoryId : categoryIds) {
                catalogService.getCategoryCourses(categoryId, null, 0, limit).getContent()
                        .forEach(course -> ranked.putIfAbsent(course.getId(), course));
                if (ranked.size() >= limit) break;
            }
        }
        return ranked.values().stream().limit(limit).toList();
    }

    /** Dựng context lộ trình từ lựa chọn visitor và course public thật. */
    private String learningPathContext(SupportConversationEntity conversation,
                                       List<PublicCourseCardResponse> courses) {
        String courseContext = courses.stream().map(course -> String.format(
                        "id=%s; tên=%s; level=%s; category=%s; giá=%s; hình thức=%s",
                        course.getId(), course.getName(), course.getLevel(), course.getCategoryName(),
                        course.getCurrentPrice(), course.getDeliveryModes()))
                .reduce((left, right) -> left + "\n" + right).orElse("Không có khóa học phù hợp.");
        return "Thời gian mỗi tuần: " + extractContext(conversation.getGuidedContext(), "time")
                + "\nHình thức: " + extractContext(conversation.getGuidedContext(), "deliveryMode")
                + "\nMục tiêu/khóa học muốn học: " + extractContext(conversation.getGuidedContext(), "courseQuery")
                + "\nKhóa học thật trong hệ thống:\n" + courseContext;
    }

    /** Dựng context giá theo ngân sách và các package active thật, không sinh course card. */
    private String pricingContext(SupportConversationEntity conversation) {
        String packages = coursePackageRepository.findPublicPackages(null, PageRequest.of(0, 100)).stream()
                .map(item -> String.format("loại=%s; tên gói=%s; giá=%s; thời hạn=%s ngày",
                        item.getDeliveryMode(), item.getName(), item.getPrice(), item.getDurationDays()))
                .reduce((left, right) -> left + "\n" + right).orElse("Chưa có gói học active.");
        return "Ngân sách: " + extractContext(conversation.getGuidedContext(), "budget")
                + "\nLoại gói quan tâm: " + extractContext(conversation.getGuidedContext(), "deliveryMode")
                + "\nCác gói active dùng để so sánh giá (không liệt kê khóa học):\n" + packages;
    }

    /** Dựng context ba hình thức học từ enum hệ thống và package active hiện có. */
    private String deliveryContext() {
        return "AILMS có đúng 3 hình thức chính:\n"
                + "SELF_STUDY: tự học theo tiến độ cá nhân.\n"
                + "GROUP_CLASS: học lớp nhóm có lịch và tương tác.\n"
                + "ONE_ON_ONE: gia sư 1-1 cá nhân hóa.\n"
                + "COMBO là sự kết hợp các hình thức trên, không phải hình thức thứ tư.";
    }

    /** Chọn card dữ liệu thật đi kèm template, không để AI tạo ID, giá hoặc đường dẫn. */
    private List<SupportResourceResponse> resourcesForOption(String optionId) {
        if ("POLICY".equals(optionId)) return currentPolicyResource();
        List<CourseEntity> courses = courseRepository.findActiveCoursesForSale(null, null, null,
                PageRequest.of(0, 4)).getContent();
        List<SupportResourceResponse> resources = new java.util.ArrayList<>();
        if ("LEARNING_PATH".equals(optionId)) {
            categoryRepository.findPublicCategoryCourseCounts(BaseStatusEnum.ACTIVE).stream().limit(4)
                    .map(this::toCategoryResource).forEach(resources::add);
        } else if ("PRICING".equals(optionId) || "DELIVERY".equals(optionId)) {
            if (!courses.isEmpty()) {
                coursePackageRepository.findByCourseEntity_IdInAndStatus(courses.stream().map(CourseEntity::getId).toList(),
                        CoursePackageStatusEnum.ACTIVE).stream().limit(6).map(this::toPackageResource).forEach(resources::add);
            }
        } else {
            courses.stream().map(this::toCourseResource).forEach(resources::add);
        }
        return resources;
    }

    /** Đổi option ID đã kiểm soát thành nhãn lưu lịch sử, không nhận label từ frontend. */
    private String labelForOption(String optionId) {
        return switch (optionId) {
            case "COURSE_CONSULTING" -> "Tìm khóa học phù hợp";
            case "LEARNING_PATH" -> "Tư vấn lộ trình học";
            case "PRICING" -> "Xem học phí và gói học";
            case "DELIVERY" -> "Tìm hiểu hình thức học";
            case "POLICY" -> "Chính sách thanh toán/hoàn tiền";
            case "REQUEST_AGENT" -> "Kết nối với tư vấn viên";
            case "LEVEL_BEGINNER" -> "Cơ bản";
            case "LEVEL_INTERMEDIATE" -> "Trung cấp";
            case "LEVEL_ADVANCED" -> "Nâng cao";
            case "TIME_UNDER_3" -> "Dưới 3 giờ mỗi tuần";
            case "TIME_3_5" -> "3–5 giờ mỗi tuần";
            case "TIME_6_10" -> "6–10 giờ mỗi tuần";
            case "TIME_OVER_10" -> "Trên 10 giờ mỗi tuần";
            case "MODE_SELF_STUDY" -> "Tự học";
            case "MODE_GROUP_CLASS" -> "Học nhóm";
            case "MODE_ONE_ON_ONE" -> "Gia sư 1-1";
            case "CATEGORY_DONE" -> "Hoàn tất chọn chủ đề";
            case "GOAL_CAREER" -> "Phát triển nghề nghiệp";
            case "GOAL_SKILL" -> "Bổ sung kỹ năng";
            case "GOAL_EXAM" -> "Ôn thi/chứng chỉ";
            default -> {
                if (!optionId.startsWith("CATEGORY_")) throw new IllegalArgumentException("Option không hợp lệ hoặc đã hết hạn");
                Long categoryId = parseId(optionId.substring("CATEGORY_".length()));
                yield categoryRepository.findById(categoryId).map(com.ailms.entity.CategoryEntity::getName)
                        .orElseThrow(() -> ResourceNotFoundException.of("Category", categoryId));
            }
        };
    }

    /** Resolve resource theo loại và chỉ chấp nhận dữ liệu đang public. */
    private SupportResourceResponse resolveResource(String type, Long id) {
        return switch (type) {
            case "COURSE" -> {
                CourseEntity course = courseRepository.findById(id)
                        .filter(item -> courseRepository.isPubliclySellable(item.getId()))
                        .orElseThrow(() -> ResourceNotFoundException.of("Public course", id));
                yield toCourseResource(course);
            }
            case "CATEGORY" -> categoryRepository.findById(id)
                    .filter(item -> item.getStatus() == BaseStatusEnum.ACTIVE).map(this::toCategoryResource)
                    .orElseThrow(() -> ResourceNotFoundException.of("Public category", id));
            case "PACKAGE" -> coursePackageRepository.findById(id)
                    .filter(item -> item.getStatus() == CoursePackageStatusEnum.ACTIVE
                            && courseRepository.isPubliclySellable(item.getCourseEntity().getId()))
                    .map(this::toPackageResource)
                    .orElseThrow(() -> ResourceNotFoundException.of("Public course package", id));
            default -> throw new IllegalArgumentException("Loại tài nguyên không hợp lệ");
        };
    }

    /** Chuyển course public sang card có route frontend thật. */
    private SupportResourceResponse toCourseResource(CourseEntity course) {
        return new SupportResourceResponse("COURSE", String.valueOf(course.getId()), course.getName(),
                course.getCategoryEntity() == null ? null : course.getCategoryEntity().getName(),
                course.getThumbnailUrl(), "/courses/" + course.getId());
    }

    /** Chuyển Meilisearch course hit sang card có route frontend thật. */
    private SupportResourceResponse toCourseResource(CourseResponse course) {
        return new SupportResourceResponse("COURSE", String.valueOf(course.getId()), course.getName(),
                course.getCategoryName(), course.getThumbnailUrl(), "/courses/" + course.getId());
    }

    /** Chuyển category entity sang card có route frontend thật. */
    private SupportResourceResponse toCategoryResource(com.ailms.entity.CategoryEntity category) {
        return new SupportResourceResponse("CATEGORY", String.valueOf(category.getId()), category.getName(),
                category.getDescription(), null, "/categories/" + category.getId());
    }

    /** Chuyển dòng thống kê category sang card mà không tạo dữ liệu giả. */
    private SupportResourceResponse toCategoryResource(Object[] row) {
        return new SupportResourceResponse("CATEGORY", String.valueOf(row[0]), String.valueOf(row[1]),
                row[2] == null ? null : String.valueOf(row[2]), null, "/categories/" + row[0]);
    }

    /** Chuyển package public sang card mở đúng course và package được tham chiếu. */
    private SupportResourceResponse toPackageResource(CoursePackageEntity item) {
        String deliveryMode = item.getDeliveryMode() == null ? "Chưa xác định hình thức" : item.getDeliveryMode().name();
        String subtitle = item.getPrice() == null ? deliveryMode : deliveryMode + " · " + item.getPrice() + " VNĐ";
        return new SupportResourceResponse("PACKAGE", String.valueOf(item.getId()),
                item.getName() == null ? item.getCode() : item.getName(), subtitle,
                item.getCourseEntity().getThumbnailUrl(),
                "/courses/" + item.getCourseEntity().getId() + "?package=" + item.getId());
    }

    /** Chuyển message vào DB trước để websocket/realtime không làm mất dữ liệu. */
    private SupportMessageResponse saveMessage(SupportConversationEntity conversation, SupportMessageSenderEnum sender,
                                               SupportMessageTypeEnum type, String content, String metadata) {
        LocalDateTime now = LocalDateTime.now();
        if (sender == SupportMessageSenderEnum.VISITOR) conversation.setLastVisitorMessageAt(now);
        if (sender == SupportMessageSenderEnum.HR && type != SupportMessageTypeEnum.QUICK_REPLIES) {
            conversation.setLastHrMessageAt(now);
            conversation.setCloseRequestedAt(null);
        }
        SupportChatMessageEntity message = messageRepository.save(SupportChatMessageEntity.builder()
                .conversation(conversation).senderType(sender).messageType(type).content(content).metadata(metadata).build());
        SupportMessageResponse response = toMessage(message);
        String supportUsername = conversation.getAssignedHr() == null ? null : conversation.getAssignedHr().getUsername();
        eventPublisher.publishEvent(new SupportMessageCreatedEvent(conversation.getId(), supportUsername, response));
        return response;
    }

    /** Tính lại vị trí FIFO và thời gian chờ dựa trên số supporter còn heartbeat. */
    private void refreshQueue(SupportConversationEntity conversation) {
        if (conversation.getStatus() != SupportConversationStatusEnum.QUEUED) return;
        int position = (int) conversationRepository.countByStatusAndCreatedAtLessThan(
                SupportConversationStatusEnum.QUEUED, conversation.getCreatedAt()) + 1;
        long online = presenceRepository.countByStatusInAndLastHeartbeatAtGreaterThanEqual(
                EnumSet.of(SupportHrPresenceStatusEnum.ONLINE_AVAILABLE, SupportHrPresenceStatusEnum.ONLINE_BUSY),
                LocalDateTime.now().minusSeconds(HEARTBEAT_SECONDS));
        conversation.setQueuePosition(position);
        int serviceSlots = (int) Math.max(online, 1L);
        conversation.setEstimatedWaitMinutes(Math.max(DEFAULT_AVERAGE_MINUTES,
                (int) Math.ceil((double) position / serviceSlots) * DEFAULT_AVERAGE_MINUTES));
    }

    /** Giải phóng presence nhưng giữ assigned HR để supporter vẫn xem được lịch sử đã đóng. */
    private void releaseAssignedHr(SupportConversationEntity conversation) {
        if (conversation.getAssignedHr() == null) return;
        Long hrId = conversation.getAssignedHr().getId();
        presenceRepository.findByHrId(hrId).ifPresent(presence -> {
            boolean hasOtherWorkload = conversationRepository.countByAssignedHr_IdAndStatusInAndIdNot(hrId,
                    EnumSet.of(SupportConversationStatusEnum.ASSIGNED, SupportConversationStatusEnum.ACTIVE,
                            SupportConversationStatusEnum.WAITING_CONFIRMATION), conversation.getId()) > 0;
            presence.setStatus(hasOtherWorkload ? SupportHrPresenceStatusEnum.ONLINE_BUSY
                    : SupportHrPresenceStatusEnum.ONLINE_AVAILABLE);
            presence.setLastHeartbeatAt(LocalDateTime.now());
            presenceRepository.save(presence);
        });
    }

    /** Tính thời điểm supporter được phép yêu cầu đóng nếu visitor chưa trả lời tin gần nhất. */
    private LocalDateTime requestCloseAvailableAt(SupportConversationEntity conversation) {
        if (!isWaitingForVisitor(conversation)) return null;
        return conversation.getLastHrMessageAt().plusMinutes(REQUEST_CLOSE_WAIT_MINUTES);
    }

    /** Tính thời điểm hệ thống tự đóng nếu visitor chưa trả lời tin gần nhất. */
    private LocalDateTime autoCloseAt(SupportConversationEntity conversation) {
        if (!isWaitingForVisitor(conversation)) return null;
        return conversation.getLastHrMessageAt().plusMinutes(AUTO_CLOSE_WAIT_MINUTES);
    }

    /** Kiểm tra tin supporter gần nhất còn đang chờ visitor phản hồi. */
    private boolean isWaitingForVisitor(SupportConversationEntity conversation) {
        return EnumSet.of(SupportConversationStatusEnum.ACTIVE,
                        SupportConversationStatusEnum.WAITING_CONFIRMATION).contains(conversation.getStatus())
                && conversation.getLastHrMessageAt() != null
                && (conversation.getLastVisitorMessageAt() == null
                || conversation.getLastVisitorMessageAt().isBefore(conversation.getLastHrMessageAt()));
    }

    /** Chuyển LocalDateTime của server thành epoch millis để frontend không lệch timezone. */
    private String toEpochMillis(LocalDateTime value) {
        return value == null ? null : String.valueOf(value.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli());
    }

    /** Bảo đảm state machine chỉ chuyển qua các trạng thái được phép. */
    private void ensureStatus(SupportConversationEntity conversation, Collection<SupportConversationStatusEnum> allowed) {
        if (!allowed.contains(conversation.getStatus())) {
            throw new BusinessException("Không thể thực hiện thao tác ở trạng thái " + conversation.getStatus());
        }
    }

    /** Tạo câu trả lời template cho các nội dung không cần AI. */
    private String templateFor(String optionId) {
        return switch (optionId) {
            case "PRICING" -> "Các card dưới đây lấy trực tiếp từ những gói học đang mở bán. Giá hiển thị là dữ liệu hiện tại của hệ thống.";
            case "DELIVERY" -> "AILMS hỗ trợ tự học theo tiến độ, lớp nhóm trực tuyến và học 1-1 tùy từng gói đang mở bán. Chọn card để xem hình thức và quyền lợi cụ thể.";
            case "TEACHERS" -> "Bạn có thể xem hồ sơ công khai và các khóa học đang giảng dạy của giáo viên trên trang Đội ngũ giảng viên.";
            case "POLICY" -> readCurrentPolicy();
            default -> "Bạn hãy chọn một chủ đề để mình hỗ trợ tiếp.";
        };
    }

    /** Đọc nội dung policy hiện hành từ object MinIO được quản lý bởi file_metadata. */
    private String readCurrentPolicy() {
        FileMetadataEntity policy = currentPolicy().orElse(null);
        if (policy == null || !fileStorageService.exists(policy.getFileKey())) {
            return "Chính sách thanh toán và hoàn tiền hiện chưa có tài liệu công khai.";
        }
        try (java.io.InputStream input = fileStorageService.download(policy.getFileKey())) {
            byte[] bytes = input.readNBytes(200_001);
            if (bytes.length > 200_000) throw new BusinessException("Tài liệu policy vượt quá giới hạn hiển thị");
            return new String(bytes, StandardCharsets.UTF_8).trim();
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            return "Không thể đọc tài liệu chính sách hiện hành. Vui lòng kết nối tư vấn viên.";
        }
    }

    /** Tạo link policy từ đúng file active mới nhất, không lưu URL ký tạm vào database. */
    private List<SupportResourceResponse> currentPolicyResource() {
        return currentPolicy().filter(item -> fileStorageService.exists(item.getFileKey())).map(item -> List.of(
                new SupportResourceResponse("POLICY", String.valueOf(item.getId()), item.getOriginalName(),
                        "Tài liệu chính sách hiện hành", null,
                        fileStorageService.getPresignedUrl(item.getFileKey(), Duration.ofMinutes(10)))))
                .orElseGet(List::of);
    }

    /** Lấy metadata policy mới nhất đang ACTIVE để hỗ trợ versioning theo thời điểm upload. */
    private java.util.Optional<FileMetadataEntity> currentPolicy() {
        return fileMetadataRepository.findFirstByUsageTypeAndStatusOrderByCreatedAtDesc(
                FileUsageTypeEnum.POLICY, BaseStatusEnum.ACTIVE);
    }

    /** Dựng lộ trình theo thứ tự level từ course public thật trong danh mục đã chọn. */
    private SupportMessageResponse learningPath(SupportConversationEntity conversation, Long categoryId) {
        List<PublicCourseCardResponse> steps = new java.util.ArrayList<>();
        for (CourseLevelEnum level : List.of(CourseLevelEnum.BEGINNER, CourseLevelEnum.INTERMEDIATE,
                CourseLevelEnum.ADVANCED)) {
            List<PublicCourseCardResponse> levelCourses = catalogService
                    .getCategoryCourses(categoryId, level, 0, 1).getContent();
            if (!levelCourses.isEmpty()) steps.add(levelCourses.getFirst());
        }
        String content = steps.isEmpty()
                ? "Hiện chưa có đủ khóa học công khai để xây dựng lộ trình cho danh mục này."
                : "Lộ trình được sắp theo thứ tự từ cơ bản đến nâng cao. Chọn từng bước để xem chi tiết.";
        return saveMessage(conversation, SupportMessageSenderEnum.BOT, SupportMessageTypeEnum.COURSE_RESULTS,
                content, writeJson(Map.of("presentation", "LEARNING_PATH", "courses", steps)));
    }

    /** Gộp các giá trị guided đã kiểm soát vào JSON context hiện tại. */
    private String mergeContext(String context, Map<String, Object> updates) {
        try {
            tools.jackson.databind.node.ObjectNode values = context == null || context.isBlank()
                    ? objectMapper.createObjectNode()
                    : (tools.jackson.databind.node.ObjectNode) objectMapper.readTree(context);
            updates.forEach((key, value) -> values.set(key, objectMapper.valueToTree(value)));
            return objectMapper.writeValueAsString(values);
        } catch (Exception exception) {
            throw new IllegalStateException("Guided context không hợp lệ", exception);
        }
    }

    /** Truy vấn khóa học thật theo danh mục và level đã chọn trong guided flow. */
    private SupportMessageResponse recommendCourses(SupportConversationEntity conversation, String goal) {
        Long categoryId = extractContextId(conversation.getGuidedContext(), "categoryId");
        String levelText = extractContext(conversation.getGuidedContext(), "level");
        List<PublicCourseCardResponse> courses = categoryId == null ? List.of() : catalogService
                .recommendCourses(categoryId, levelText == null ? null : CourseLevelEnum.valueOf(levelText), goal, 5)
                .getContent();
        return saveMessage(conversation, SupportMessageSenderEnum.BOT, SupportMessageTypeEnum.COURSE_RESULTS,
                courses.isEmpty() ? "Hiện chưa có khóa học phù hợp với lựa chọn này." : "Đây là các khóa học phù hợp với bạn.",
                writeJson(Map.of("goal", goal, "courses", courses)));
    }

    /** Ghi level vào JSON context kiểm soát mà không nhận nội dung tự do làm prompt. */
    private String contextWithLevel(String context, String level) {
        try {
            Map<String, Object> values = new java.util.HashMap<>();
            String categoryId = extractContext(context, "categoryId");
            if (categoryId != null) values.put("categoryId", Long.valueOf(categoryId));
            values.put("level", level);
            return objectMapper.writeValueAsString(values);
        } catch (Exception exception) {
            throw new IllegalStateException("Guided context không hợp lệ", exception);
        }
    }

    /** Lấy giá trị key từ JSON context guided. */
    private String extractContext(String context, String key) {
        if (context == null || context.isBlank()) return null;
        try {
            tools.jackson.databind.JsonNode value = objectMapper.readTree(context).get(key);
            return value == null || value.isNull() ? null : value.asText();
        } catch (Exception exception) {
            throw new IllegalStateException("Guided context không hợp lệ", exception);
        }
    }

    /** Lấy ID category trong context guided. */
    private Long extractContextId(String context, String key) {
        String value = extractContext(context, key);
        return value == null ? null : parseId(value);
    }

    /** Lấy danh sách Snowflake ID từ context guided mà không ép sang JavaScript number. */
    private List<Long> extractContextIds(String context, String key) {
        if (context == null || context.isBlank()) return List.of();
        try {
            tools.jackson.databind.JsonNode node = objectMapper.readTree(context).get(key);
            if (node == null || !node.isArray()) return List.of();
            List<Long> ids = new java.util.ArrayList<>();
            node.forEach(item -> ids.add(parseId(item.asText())));
            return ids;
        } catch (Exception exception) {
            throw new IllegalStateException("Danh sách ID trong guided context không hợp lệ", exception);
        }
    }

    /** Đọc ID option an toàn, không để lỗi parse làm lộ stack trace. */
    private Long parseId(String value) {
        try { return Long.valueOf(value); } catch (NumberFormatException exception) { throw new IllegalArgumentException("Option không hợp lệ"); }
    }

    /** Hash token bằng SHA-256 để không lưu credential visitor dạng plain text. */
    private String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException exception) { throw new IllegalStateException("SHA-256 unavailable", exception); }
    }

    /** Serialize metadata an toàn cho frontend render structured response. */
    private String writeJson(Object value) {
        try { return objectMapper.writeValueAsString(value); } catch (Exception exception) { return "{}"; }
    }

    /** Chuyển entity conversation thành DTO không lộ token/quan hệ user. */
    private SupportConversationResponse toConversation(SupportConversationEntity item) {
        return new SupportConversationResponse(item.getId(), item.getStatus(), item.getQueuePosition(),
                item.getEstimatedWaitMinutes(), (item.getFullName() != null && item.getEmail() != null)
                        || item.getPhone() != null, item.getFullName(), item.getEmail(), item.getCreatedAt(),
                toEpochMillis(item.getCreatedAt()), item.getStartedAt(),
                item.getEndedAt(), toEpochMillis(requestCloseAvailableAt(item)), toEpochMillis(autoCloseAt(item)),
                item.getAssignedHr() == null ? null : item.getAssignedHr().getFullName(),
                item.getAssignedHr() == null ? null : item.getAssignedHr().getAvatarUrl());
    }

    /** Chuyển entity message thành DTO biên API. */
    private SupportMessageResponse toMessage(SupportChatMessageEntity item) {
        return new SupportMessageResponse(item.getId(), item.getSenderType(), item.getMessageType(), item.getContent(),
                responseMetadata(item), item.getCreatedAt());
    }

    /** Làm mới presigned URL attachment khi đọc lịch sử thay vì dùng URL đã hết hạn. */
    private String responseMetadata(SupportChatMessageEntity item) {
        if (item.getMessageType() != SupportMessageTypeEnum.ATTACHMENT || item.getMetadata() == null) {
            return item.getMetadata();
        }
        try {
            tools.jackson.databind.JsonNode node = objectMapper.readTree(item.getMetadata());
            String fileKey = node.get("fileKey").asText();
            Map<String, Object> metadata = new java.util.HashMap<>();
            metadata.put("fileKey", fileKey);
            metadata.put("fileName", node.get("fileName").asText());
            metadata.put("contentType", node.get("contentType").asText());
            metadata.put("size", node.get("size").asLong());
            metadata.put("url", fileStorageService.getPresignedUrl(fileKey, Duration.ofHours(24)));
            return writeJson(metadata);
        } catch (Exception exception) {
            return item.getMetadata();
        }
    }
}
