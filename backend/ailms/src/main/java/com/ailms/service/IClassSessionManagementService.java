package com.ailms.service;

import com.ailms.request.CancelClassSessionRequest;
import com.ailms.request.ScheduleClassSessionRequest;
import com.ailms.response.ClassOnlineResponse;
import com.ailms.response.ClassSessionUsageResponse;

/** Quản lý quota, đặt lịch và hủy buổi học ở màn chi tiết lớp. */
public interface IClassSessionManagementService {

    /** Trả thống kê quota, chỉ trừ những buổi đã kết thúc và đã nhận xét. */
    ClassSessionUsageResponse getUsage(Long classId);

    /** Đặt buổi học mới bằng danh tính người dùng hiện tại. */
    ClassOnlineResponse schedule(Long classId, Long actorUserId, ScheduleClassSessionRequest request);

    /** Hủy buổi học trước giờ bắt đầu ít nhất một tiếng. */
    ClassOnlineResponse cancel(Long classId, Long sessionId, Long actorUserId, CancelClassSessionRequest request);

    /** Đồng bộ quota và đóng lớp sau khi nhận xét buổi học thành công. */
    void sessionReviewed(Long classId);
}
