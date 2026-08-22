package com.ailms.service.imp;

import com.ailms.common.snowflake.SnowflakeIdGenerator;
import com.ailms.entity.enums.NotificationTypeEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BadRequestException;
import com.ailms.exception.ForbiddenException;
import com.ailms.request.CreateAdminNotificationRequest;
import com.ailms.response.ai.AiNotificationDraftResponse;
import com.ailms.service.INotificationService;
import lombok.Builder;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Quản lý draft thông báo AI một lần trong Redis; chỉ Admin xác nhận mới gửi. */
@Service
@RequiredArgsConstructor
public class AiNotificationActionService {

    private static final String REDIS_KEY_PREFIX = "ai:notification-draft:";
    private static final Duration DRAFT_TTL = Duration.ofMinutes(10);
    private static final List<String> ALLOWED_TARGET_ROLES =
            List.of("ADMIN", "HR", "TEACHER", "INSTRUCTOR", "EMPLOYEE", "STUDENT");

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    private final SnowflakeIdGenerator snowflakeIdGenerator;
    private final INotificationService notificationService;
    private final ApplicationEventPublisher applicationEventPublisher;

    /** Lưu draft do Gemini đề xuất, không gửi thông báo tại bước này. */
    public AiNotificationDraftResponse createDraft(
            Map<String, Object> arguments, AiToolAccessContext context) {
        requireAdmin(context);
        String title = requiredText(arguments, "title", 255);
        String content = requiredText(arguments, "content", 4_000);
        boolean broadcastAll = Boolean.TRUE.equals(arguments.get("broadcastAll"));
        String targetRole = optionalText(arguments, "targetRole");
        if (broadcastAll == (targetRole != null)) {
            throw new BadRequestException("Draft thông báo phải chọn đúng broadcastAll hoặc targetRole");
        }
        if (targetRole != null && !ALLOWED_TARGET_ROLES.contains(targetRole.toUpperCase(Locale.ROOT))) {
            throw new BadRequestException("targetRole không được hỗ trợ");
        }
        String draftId = String.valueOf(snowflakeIdGenerator.nextId());
        Instant expiresAt = Instant.now().plus(DRAFT_TTL);
        AiNotificationDraft draft = AiNotificationDraft.builder()
                .draftId(draftId)
                .ownerId(context.ownerId())
                .title(title)
                .content(content)
                .broadcastAll(broadcastAll)
                .targetRole(targetRole == null ? null : targetRole.toUpperCase(Locale.ROOT))
                .expiresAt(expiresAt.toString())
                .build();
        redisTemplate.opsForValue().set(redisKey(draftId), serialize(draft), DRAFT_TTL);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "AI_NOTIFICATION_DRAFTED",
                "AiNotificationDraft", context.ownerId(), null,
                Map.of("draftId", draftId, "broadcastAll", broadcastAll,
                        "targetRole", targetRole == null ? "" : targetRole)));
        return response(draft);
    }

    /** Lấy và xóa atomically draft một lần, sau đó gửi bằng notification service chuẩn. */
    public AiNotificationDraftResponse confirmAndSend(
            String draftId, Long currentUserId) {
        AiNotificationDraft draft = deserialize(redisTemplate.opsForValue().getAndDelete(redisKey(draftId)));
        if (!draft.getOwnerId().equals(currentUserId)) {
            throw new ForbiddenException("Draft thông báo không thuộc Admin hiện tại");
        }
        CreateAdminNotificationRequest request = CreateAdminNotificationRequest.builder()
                .type(NotificationTypeEnum.ADMIN_ANNOUNCEMENT)
                .title(draft.getTitle())
                .content(draft.getContent())
                .broadcastAll(draft.isBroadcastAll() ? Boolean.TRUE : null)
                .targetRole(draft.getTargetRole())
                .build();
        notificationService.processAdminNotification(currentUserId, request);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "AI_NOTIFICATION_SENT",
                "AiNotificationDraft", currentUserId, null,
                Map.of("draftId", draftId, "broadcastAll", draft.isBroadcastAll(),
                        "targetRole", draft.getTargetRole() == null ? "" : draft.getTargetRole())));
        return response(draft);
    }

    /** Chuẩn hóa response để Gemini hoặc API hiển thị rõ đây là draft chưa gửi. */
    private AiNotificationDraftResponse response(AiNotificationDraft draft) {
        return AiNotificationDraftResponse.builder()
                .draftId(draft.getDraftId())
                .title(draft.getTitle())
                .content(draft.getContent())
                .targetSummary(draft.isBroadcastAll() ? "Tất cả người dùng đang hoạt động"
                        : "Tất cả người dùng role " + draft.getTargetRole())
                .expiresAt(draft.getExpiresAt())
                .requiresConfirmation(true)
                .build();
    }

    /** Bắt buộc context công cụ phải có role Admin. */
    private void requireAdmin(AiToolAccessContext context) {
        if (!context.roles().contains("ROLE_ADMIN")) {
            throw new ForbiddenException("Chỉ Admin được tạo draft thông báo bằng AI");
        }
    }

    /** Đọc text bắt buộc trong giới hạn an toàn trước khi lưu Redis. */
    private String requiredText(Map<String, Object> arguments, String key, int maxLength) {
        String value = optionalText(arguments, key);
        if (value == null) {
            throw new BadRequestException(key + " không được để trống");
        }
        if (value.length() > maxLength) {
            throw new BadRequestException(key + " vượt quá " + maxLength + " ký tự");
        }
        return value;
    }

    /** Đọc text tùy chọn và loại khoảng trắng thừa. */
    private String optionalText(Map<String, Object> arguments, String key) {
        Object value = arguments.get(key);
        if (value == null || String.valueOf(value).isBlank()) {
            return null;
        }
        return String.valueOf(value).trim();
    }

    /** Tạo key Redis không chứa nội dung hoặc thông tin người nhận. */
    private String redisKey(String draftId) {
        return REDIS_KEY_PREFIX + draftId;
    }

    /** Serialize draft có schema nội bộ cố định trước khi đưa vào Redis. */
    private String serialize(AiNotificationDraft draft) {
        try {
            return objectMapper.writeValueAsString(draft);
        } catch (Exception exception) {
            throw new IllegalStateException("Không thể lưu draft thông báo AI", exception);
        }
    }

    /** Lấy draft một lần hoặc báo rõ draft đã hết hạn/đã được dùng. */
    private AiNotificationDraft deserialize(String value) {
        if (value == null) {
            throw new BadRequestException("Draft thông báo không tồn tại, đã hết hạn hoặc đã được gửi");
        }
        try {
            return objectMapper.readValue(value, AiNotificationDraft.class);
        } catch (Exception exception) {
            throw new BadRequestException("Draft thông báo không hợp lệ");
        }
    }

    /** Payload Redis tối thiểu cho thông báo chờ Admin xác nhận. */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiNotificationDraft {
        private String draftId;
        private Long ownerId;
        private String title;
        private String content;
        private boolean broadcastAll;
        private String targetRole;
        private String expiresAt;
    }
}
