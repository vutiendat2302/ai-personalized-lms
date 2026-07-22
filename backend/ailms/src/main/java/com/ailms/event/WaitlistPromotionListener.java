package com.ailms.event;

import com.ailms.service.IClassMemberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Khi một học viên rời lớp, listener sẽ tự động kiểm tra
 * danh sách chờ và đưa học viên phù hợp tiếp theo vào lớp học
 * nếu còn chỗ trống.
 */

@Component
@RequiredArgsConstructor
@Slf4j
public class WaitlistPromotionListener {

    private final IClassMemberService classMemberService;

    @EventListener
    public void handleClassMemberLeft(ClassMemberLeftEvent event) {
        log.info("ClassMemberLeftEvent received for classId: {}", event.getClassId());
        try {
            classMemberService.promoteNextWaitlist(event.getClassId());
        } catch (Exception e) {
            log.error("Failed to promote next waitlist for classId: {}", event.getClassId(), e);
        }
    }
}
