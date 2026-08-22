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
    GENERAL,

    /** Học viên vừa tham gia một lớp do người nhận phụ trách. */
    CLASS_STUDENT_JOINED,

    /** Học viên vừa nộp assignment cần người nhận theo dõi/chấm. */
    ASSIGNMENT_SUBMITTED,

    /** Học viên vừa nộp quiz hoặc bài thi. */
    QUIZ_SUBMITTED,

    /** Buổi dạy vừa kết thúc và có thể cần nhận xét. */
    TEACHING_SESSION_COMPLETED,

    /** Người dạy vừa hoàn tất nhận xét một buổi học. */
    SESSION_REVIEWED,

    /** Lớp vừa được đặt thêm một buổi học. */
    CLASS_SESSION_SCHEDULED,

    /** Một buổi học của lớp vừa bị hủy. */
    CLASS_SESSION_CANCELLED
}
