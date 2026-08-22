package com.ailms.entity.enums;

/**
 * Trạng thái tham gia lớp học của học viên.
 * ACTIVE     : Đang tham gia lớp học.
 * WAITLISTED : Đang trong danh sách chờ, chưa chính thức tham gia lớp.
 * REMOVED    : Đã bị xóa hoặc rời khỏi lớp học.
 * COMPLETED  : Đã hoàn thành lớp học.
 */
public enum ClassMemberStatusEnum implements Transitionable<ClassMemberStatusEnum> {
    ACTIVE,
    WAITLISTED,
    REMOVED,
    COMPLETED;

    @Override
    public boolean canTransitionTo(ClassMemberStatusEnum target) {
        switch (this) {
            case WAITLISTED:
                return target == ACTIVE || target == REMOVED;
            case ACTIVE:
                return target == REMOVED || target == COMPLETED;
            case REMOVED:
            case COMPLETED:
                return target == ACTIVE || target == WAITLISTED;
            default:
                return false;
        }
    }
}
