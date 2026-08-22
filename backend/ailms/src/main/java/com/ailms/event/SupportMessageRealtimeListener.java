package com.ailms.event;

import com.ailms.entity.enums.SupportMessageSenderEnum;
import com.ailms.response.support.SupportMessageNotificationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Phát tin nhắn đã commit tới visitor và kênh thông báo chung của Support. */
@Component
@RequiredArgsConstructor
public class SupportMessageRealtimeListener {
    private final SimpMessagingTemplate messagingTemplate;

    /** Broadcast mọi message theo conversation và báo riêng Support khi visitor gửi tin. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void broadcast(SupportMessageCreatedEvent event) {
        messagingTemplate.convertAndSend("/topic/support/" + event.conversationId(), event.message());
        if (SupportMessageSenderEnum.VISITOR.equals(event.message().senderType())
                && event.supportUsername() != null) {
            messagingTemplate.convertAndSendToUser(event.supportUsername(), "/queue/support-notifications",
                    new SupportMessageNotificationResponse(event.conversationId().toString(), event.message()));
        }
    }
}
