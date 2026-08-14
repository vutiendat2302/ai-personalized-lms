package com.ailms.job;

import com.ailms.repository.SupportHrPresenceRepository;
import com.ailms.repository.SupportConversationRepository;
import com.ailms.entity.enums.SupportConversationStatusEnum;
import com.ailms.service.ISupportChatService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.EnumSet;

/** Đồng bộ OFFLINE tự động khi supporter đóng trang hoặc mất kết nối heartbeat. */
@Component
@RequiredArgsConstructor
public class SupportPresenceTimeoutJob {
    private static final int HEARTBEAT_TIMEOUT_SECONDS = 90;
    private final SupportHrPresenceRepository presenceRepository;
    private final SupportConversationRepository conversationRepository;
    private final ISupportChatService supportChatService;

    /** Quét mỗi 30 giây và đánh dấu heartbeat quá hạn thành OFFLINE. */
    @Scheduled(fixedDelay = 30000)
    @Transactional
    public void markStaleSupportersOffline() {
        LocalDateTime threshold = LocalDateTime.now().minusSeconds(HEARTBEAT_TIMEOUT_SECONDS);
        conversationRepository.requeueFromStaleSupporters(EnumSet.of(
                SupportConversationStatusEnum.ASSIGNED, SupportConversationStatusEnum.ACTIVE,
                SupportConversationStatusEnum.WAITING_CONFIRMATION), threshold);
        presenceRepository.markStaleOffline(threshold);
        supportChatService.closeVisitorResponseTimeouts();
    }
}
