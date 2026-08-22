package com.ailms.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Sự kiện được phát sinh khi một học viên rời khỏi lớp học.
 * Sự kiện này được sử dụng để thông báo
 * - Ghi nhận lịch sử hoạt động.
 */
@Getter
public class ClassMemberLeftEvent extends ApplicationEvent {
    private final Long classId;

    public ClassMemberLeftEvent(Object source, Long classId) {
        super(source);
        this.classId = classId;
    }
}
