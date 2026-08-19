package com.ailms.job;

import com.ailms.service.IOneOnOneService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Đóng các trial không được giáo viên nhận xét sau 24 giờ và khởi động lại matching. */
@Component
@RequiredArgsConstructor
@Slf4j
public class OneOnOneTrialReviewExpiryJob {

    private final IOneOnOneService oneOnOneService;

    /** Quét mỗi phút để trạng thái đổi gần thời điểm hết hạn. */
    @Scheduled(fixedDelay = 60000)
    public void expireUnreviewedTrials() {
        int expired = oneOnOneService.expireUnreviewedTrials();
        if (expired > 0) log.info("Expired {} one-on-one trials without instructor review", expired);
    }
}
