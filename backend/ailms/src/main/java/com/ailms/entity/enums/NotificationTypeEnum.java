package com.ailms.entity.enums;

/**
 * Loại thông báo, dùng để FE render icon, route link và phân loại hiển thị.
 *
 * Nhóm ADMIN: Thông báo do quản trị viên tạo thủ công.
 * Nhóm SYSTEM: Thông báo do hệ thống tự động sinh ra khi xảy ra sự kiện nghiệp vụ.
 */
public enum NotificationTypeEnum {

    // ======= Nhóm ADMIN tạo thủ công =======

    /** Thông báo chung / broadcast toàn hệ thống hoặc theo nhóm. */
    ADMIN_ANNOUNCEMENT,

    /** Cảnh báo cá nhân tới 1 người dùng cụ thể. */
    ADMIN_WARNING,

    /** Thông báo bảo trì hệ thống. */
    ADMIN_MAINTENANCE,

    // ======= Nhóm SYSTEM tự sinh (event-driven) =======

    /** Người dùng hoàn thành khóa học. */
    COURSE_COMPLETED,

    /** Người dùng đăng ký khóa học mới. */
    COURSE_ENROLLED,

    /** Báo cáo được nộp. */
    REPORT_SUBMITTED,

    /** Báo cáo được phê duyệt. */
    REPORT_APPROVED,

    /** Đơn nghỉ phép được phê duyệt. */
    LEAVE_REQUEST_APPROVED,

    /** Loại thông báo chung, không thuộc nhóm cụ thể. */
    GENERAL
}
