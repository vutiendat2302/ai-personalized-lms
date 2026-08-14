package com.ailms.service.imp;

import com.ailms.common.snowflake.SnowflakeIdGenerator;
import com.ailms.event.AuditLogEvent;
import com.ailms.service.INotificationService;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Map;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Kiểm tra draft AI không tự gửi và confirmation chỉ lấy draft một lần. */
class AiNotificationActionServiceTest {

    /** Admin tạo draft chỉ lưu Redis, không chạm NotificationService. */
    @Test
    void createDraftStoresPreviewWithoutSending() {
        RedisTemplate<String, String> redisTemplate = mock(RedisTemplate.class);
        ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(values);
        INotificationService notificationService = mock(INotificationService.class);
        AiNotificationActionService service = service(redisTemplate, notificationService);

        var draft = service.createDraft(Map.of(
                "title", "Bảo trì hệ thống",
                "content", "Hệ thống bảo trì lúc 22:00.",
                "targetRole", "STUDENT"), new AiToolAccessContext(10L, java.util.List.of("ROLE_ADMIN")));

        assertTrue(draft.isRequiresConfirmation());
        assertEquals("Tất cả người dùng role STUDENT", draft.getTargetSummary());
        verify(values).set(anyString(), anyString(), any(Duration.class));
        verify(notificationService, times(0)).processAdminNotification(any(), any());
    }

    /** Admin xác nhận draft đúng owner thì draft bị lấy một lần và chuyển vào service gửi chuẩn. */
    @Test
    void confirmAndSendUsesDraftOnce() throws Exception {
        RedisTemplate<String, String> redisTemplate = mock(RedisTemplate.class);
        ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(values);
        JsonMapper objectMapper = new JsonMapper();
        String serialized = objectMapper.writeValueAsString(AiNotificationActionService.AiNotificationDraft.builder()
                .draftId("123").ownerId(10L).title("Bảo trì")
                .content("Bảo trì lúc 22:00.").broadcastAll(true)
                .expiresAt("2026-08-12T11:00:00Z").build());
        when(values.getAndDelete("ai:notification-draft:123")).thenReturn(serialized);
        INotificationService notificationService = mock(INotificationService.class);
        AiNotificationActionService service = service(redisTemplate, notificationService);

        var response = service.confirmAndSend("123", 10L);

        assertEquals("123", response.getDraftId());
        verify(notificationService).processAdminNotification(any(), any());
        verify(values).getAndDelete("ai:notification-draft:123");
    }

    /** Tạo service với hạ tầng mock để test an toàn, không cần Redis hoặc MySQL. */
    private AiNotificationActionService service(
            RedisTemplate<String, String> redisTemplate, INotificationService notificationService) {
        return new AiNotificationActionService(redisTemplate, new JsonMapper(), new SnowflakeIdGenerator(),
                notificationService, mock(ApplicationEventPublisher.class));
    }
}
