package com.ailms.service.imp;

import com.ailms.service.IOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class OrderExpirationScheduler {

    private final IOrderService orderService;

    /**
     * Sweep stale PENDING orders every 5 minutes (300,000 ms) and transition to EXPIRED.
     */
    @Scheduled(fixedDelay = 300000)
    public void sweepExpiredOrders() {
        try {
            orderService.cancelExpiredOrders();
        } catch (Exception e) {
            log.error("Error running OrderExpirationScheduler sweep", e);
        }
    }
}
