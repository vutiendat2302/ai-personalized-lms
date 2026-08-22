package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.ClassResponse;
import com.ailms.response.CoursePackageResponse;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service điều phối và quản lý lớp học (xếp lớp, chuyển lớp, đổi giáo viên, xin nghỉ/rút lui của giáo viên).
 */
public interface IClassManagementService {

    /**
     * Tạo lớp học nhóm mới.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    ClassResponse createGroupClass(CreateGroupClassRequest request);

    /**
     * Tạo gói khóa học mới.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CoursePackageResponse createCoursePackage(CreateCoursePackageRequest request);

    /**
     * Xếp lớp tự động cho học viên sau khi đăng ký thành công dựa trên lịch học yêu cầu.
     *
     * @param userId ID của người dùng (User)
     * @param coursePackageId ID của gói học phí khóa học
     * @param requestedScheduleJson Chuỗi JSON biểu diễn lịch học mong muốn
     */
    void processEnrollmentPlacement(Long userId, Long coursePackageId, String requestedScheduleJson);

    /**
     * Xóa học viên khỏi lớp học và tự động chuyển học viên tiếp theo từ danh sách chờ vào lớp.
     *
     * @param classId ID của lớp học
     * @param userId ID của người dùng (User)
     */
    void removeMemberAndPromoteWaitlist(Long classId, Long userId);

    /**
     * Gửi yêu cầu xin chuyển lớp học.
     *
     * @param userId ID của người dùng (User)
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void requestClassTransfer(Long userId, ClassTransferRequest request);

    /**
     * Phê duyệt hoặc từ chối yêu cầu chuyển lớp.
     *
     * @param approvalRequestId Tham số approvalRequestId
     * @param approve true nếu đồng ý phê duyệt, false nếu từ chối
     * @param rejectionReason Lý do từ chối phê duyệt
     * @param adminUserId ID của quản trị viên thực hiện thao tác
     */
    void approveClassTransfer(Long approvalRequestId, boolean approve, String rejectionReason, Long adminUserId);

    /**
     * Gửi yêu cầu xin đổi giáo viên dạy lớp.
     *
     * @param userId ID của người dùng (User)
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void requestTeacherChange(Long userId, TeacherChangeRequest request);

    /**
     * Phê duyệt hoặc từ chối yêu cầu đổi giáo viên.
     *
     * @param approvalRequestId Tham số approvalRequestId
     * @param approve true nếu đồng ý phê duyệt, false nếu từ chối
     * @param rejectionReason Lý do từ chối phê duyệt
     * @param adminUserId ID của quản trị viên thực hiện thao tác
     */
    void approveTeacherChange(Long approvalRequestId, boolean approve, String rejectionReason, Long adminUserId);

    /**
     * Giáo viên gửi yêu cầu rút lui không tiếp tục giảng dạy lớp học.
     *
     * @param teacherEmployeeId ID nhân viên của giáo viên
     * @param classId ID của lớp học
     * @param reason Lý do thực hiện hành động
     */
    void requestTeacherWithdrawal(Long teacherEmployeeId, Long classId, String reason);

    /**
     * Thay đổi lịch của một buổi học trực tuyến (Online Class).
     *
     * @param classOnlineId ID của buổi học trực tuyến
     * @param newScheduledAt Thời gian lên lịch mới của buổi học trực tuyến
     * @param durationMin Thời lượng giảng dạy tính bằng phút
     * @param teacherUserId ID của người dùng đóng vai trò giáo viên
     */
    void rescheduleOnlineClass(Long classOnlineId, LocalDateTime newScheduledAt, Integer durationMin, Long teacherUserId);

    /**
     * Thêm khung thời gian rảnh của giáo viên giảng dạy.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void addTeacherAvailability(TeacherAvailabilityRequest request);
}
