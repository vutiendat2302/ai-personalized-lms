package com.ailms.service.imp;

import com.ailms.entity.TeachingSessionPaymentEntity;
import com.ailms.entity.enums.SessionPaymentStatusEnum;
import com.ailms.repository.TeachingSessionPaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class DraftSessionPaymentCleanupScheduler {

    private final TeachingSessionPaymentRepository teachingSessionPaymentRepository;

    /**
     * Runs every hour to check for DRAFT session payments older than 24 hours without TA evaluation.
     * Soft-deletes or cancels the draft session payment.
     */
    @Scheduled(cron = "0 0 * * * ?")
    public void cleanupExpiredDrafts() {
        log.info("Starting scheduled cleanup for draft session payments older than 24 hours...");
        LocalDateTime threshold = LocalDateTime.now().minusHours(24);

        List<TeachingSessionPaymentEntity> expiredDrafts = teachingSessionPaymentRepository.findAll().stream()
                .filter(p -> p.getStatus() == SessionPaymentStatusEnum.DRAFT)
                .filter(p -> p.getCreatedAt() != null && p.getCreatedAt().isBefore(threshold))
                .toList();

        if (expiredDrafts.isEmpty()) {
            log.info("No expired DRAFT session payments found.");
            return;
        }

        log.info("Found {} expired DRAFT session payments. Cancelling...", expiredDrafts.size());
        for (TeachingSessionPaymentEntity draft : expiredDrafts) {
            draft.setStatus(SessionPaymentStatusEnum.CANCELLED);
            draft.setDescription((draft.getDescription() != null ? draft.getDescription() + " | " : "") + "Cancelled: Exceeded 24h TA evaluation window.");
            teachingSessionPaymentRepository.save(draft);
        }
        log.info("Draft session payment cleanup completed.");
    }
}
