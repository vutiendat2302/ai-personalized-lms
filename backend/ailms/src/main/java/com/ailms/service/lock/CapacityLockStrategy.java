package com.ailms.service.lock;

/**
 * Giao diện chiến lược khóa dung lượng đăng ký lớp học phòng ngừa quá tải.
 */
public interface CapacityLockStrategy {

    /**
     * Yêu cầu khóa dung lượng lớp học để chuẩn bị xếp lớp học viên.
     *
     * @param classId ID của lớp học
     */
    void acquireLock(Long classId);

    /**
     * Giải phóng khóa dung lượng lớp học.
     *
     * @param classId ID của lớp học
     */
    void releaseLock(Long classId);
}
