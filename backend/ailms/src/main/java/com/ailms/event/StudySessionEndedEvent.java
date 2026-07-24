package com.ailms.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Sự kiện được phát khi một phiên học của người dùng kết thúc.
 */
@Getter
public class StudySessionEndedEvent extends ApplicationEvent {
    private final Long userId;

    /**
     *  Khởi tạo sự kiện kết thúc phiên học.
     * @param source đối tượng phát sinh sự kiện
     * @param userId ID của người dùng
     */
    public StudySessionEndedEvent(Object source, Long userId) {
        super(source);
        this.userId = userId;
    }
}
